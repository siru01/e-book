from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from datetime import timedelta
from django.db import transaction as db_transaction
from django.db.models import Sum
from .models import Transaction, Reservation
from books.models import Book
from users.models import User
from .serializers import MyBorrowedBooksSerializer, OverdueTransactionSerializer
from django.db.models import F, ExpressionWrapper, DurationField


# ------------------- BORROW -------------------

class BorrowBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        book_id = request.data.get("book_id")

        unpaid_fine_exists = Transaction.objects.filter(
            user=request.user,
            fine_amount__gt=0,
            fine_paid=False
        ).exists()

        if unpaid_fine_exists:
            return Response(
                {"error": "You must clear your pending fines before borrowing new books"},
                status=400
            )

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=404)

        # Max 3 books rule
        active_borrows_count = Transaction.objects.filter(
            user=request.user,
            status='ISSUED'
        ).count()

        if active_borrows_count >= 3:
            return Response(
                {"error": "Borrow limit reached (maximum 3 active books allowed)"},
                status=400
            )

        # 🔹 Prevent duplicate borrow of same book
        already_borrowed = Transaction.objects.filter(
            user=request.user,
            book=book,
            status='ISSUED'
        ).exists()

        if already_borrowed:
            return Response(
                {"error": "You have already borrowed this book"},
                status=400
            )

        if book.available_copies <= 0:
            return Response({"error": "No copies available"}, status=400)

        due_date = timezone.now() + timedelta(days=14)

        with db_transaction.atomic():
            book.available_copies -= 1
            book.save()

            Transaction.objects.create(
                user=request.user,
                book=book,
                due_date=due_date,
                status='ISSUED'
            )

        return Response({
            "message": "Book borrowed successfully",
            "due_date": due_date
        }, status=201)


# ------------------- RETURN -------------------

class ReturnBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        book_id = request.data.get("book_id")

        transaction_obj = Transaction.objects.filter(
            user=request.user,
            book_id=book_id,
            status='ISSUED'
        ).order_by('-issue_date').first()

        if not transaction_obj:
            return Response(
                {"error": "No active issued record found"},
                status=404
            )

        now = timezone.now()
        transaction_obj.return_date = now
        transaction_obj.status = 'RETURNED'

        if now > transaction_obj.due_date:
            days_late = (now - transaction_obj.due_date).days
            transaction_obj.fine_amount = days_late * 5
            transaction_obj.fine_paid = False
        else:
            transaction_obj.fine_amount = 0
            transaction_obj.fine_paid = True

        with db_transaction.atomic():
            transaction_obj.save()

            book = transaction_obj.book

            #  Reservation queue
            next_reservation = Reservation.objects.filter(
                book=book,
                status='ACTIVE'
            ).order_by('reserved_at').first()

            if next_reservation:
                next_reservation.status = 'FULFILLED'
                next_reservation.save()

                due_date = timezone.now() + timedelta(days=14)

                Transaction.objects.create(
                    user=next_reservation.user,
                    book=book,
                    due_date=due_date,
                    status='ISSUED'
                )

            book.available_copies += 1
            book.save()

            
        return Response({
            "message": "Book returned successfully",
            "fine": transaction_obj.fine_amount
        })


# ------------------- MY BOOKS -------------------

class MyBorrowedBooksView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.filter(
            user=request.user,
            status='ISSUED'
        ).order_by('-issue_date')

        serializer = MyBorrowedBooksSerializer(transactions, many=True)
        return Response(serializer.data)


# ------------------- OVERDUE -------------------

class OverdueTransactionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):

        if request.user.role not in ['ADMIN', 'LIBRARIAN']:
            return Response(
                {"error": "You are not authorized"},
                status=403
            )

        now = timezone.now()

        overdue_transactions = Transaction.objects.filter(
            status='ISSUED',
            due_date__lt=now
        )

        data = []
        total_pending_fine = 0

        for t in overdue_transactions:
            days_overdue = (now - t.due_date).days
            calculated_fine = days_overdue * 5

            total_pending_fine += calculated_fine

            data.append({
                "id": t.id,
                "user_email": t.user.email,
                "book_title": t.book.title,
                "due_date": t.due_date,
                "days_overdue": days_overdue,
                "calculated_fine": calculated_fine
            })

        return Response({
            "total_pending_fine": total_pending_fine,
            "overdue_records": data
        })



# ------------------- DASHBOARD -------------------

class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):

        if request.user.role not in ['ADMIN', 'LIBRARIAN']:
            return Response(
                {"error": "You are not authorized to view dashboard"},
                status=403
            )

        total_books = Book.objects.count()

        total_available_copies = Book.objects.aggregate(
            total=Sum('available_copies')
        )['total'] or 0

        total_borrowed_books = Transaction.objects.filter(
            status='ISSUED'
        ).count()

        total_users = User.objects.count()

        overdue_transactions = Transaction.objects.filter(
            status='ISSUED',
            due_date__lt=timezone.now()
        )

        total_overdue_books = overdue_transactions.count()

        total_pending_fine = 0
        for t in overdue_transactions:
            days = (timezone.now() - t.due_date).days
            total_pending_fine += days * 5

        return Response({
            "total_books": total_books,
            "total_available_copies": total_available_copies,
            "total_borrowed_books": total_borrowed_books,
            "total_users": total_users,
            "total_overdue_books": total_overdue_books,
            "total_pending_fine": total_pending_fine
        })


class PayFineView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        transaction_id = request.data.get("transaction_id")

        try:
            transaction = Transaction.objects.get(
                id=transaction_id,
                user=request.user
            )
        except Transaction.DoesNotExist:
            return Response(
                {"error": "Transaction not found"},
                status=404
            )

        if transaction.fine_amount <= 0:
            return Response(
                {"message": "No fine pending for this transaction"},
                status=400
            )

        if transaction.fine_paid:
            return Response(
                {"message": "Fine already paid"},
                status=400
            )

        transaction.fine_paid = True
        transaction.save()

        return Response(
            {"message": "Fine paid successfully"},
            status=200
        )
# --------- RESERVATION BLOCK----------------------------------------- #
class ReserveBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        book_id = request.data.get("book_id")

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=404)

        # 🔴 Block if user has unpaid fines
        unpaid_fine_exists = Transaction.objects.filter(
            user=request.user,
            fine_amount__gt=0,
            fine_paid=False
        ).exists()

        if unpaid_fine_exists:
            return Response(
                {"error": "Clear pending fines before reserving books"},
                status=400
            )

        # 🔴 Prevent reservation if user already borrowed the book
        already_borrowed = Transaction.objects.filter(
            user=request.user,
            book=book,
            status='ISSUED'
        ).exists()

        if already_borrowed:
            return Response(
                {"error": "You already borrowed this book"},
                status=400
            )

        # 🔴 Only allow reservation if stock is 0
        if book.available_copies > 0:
            return Response(
                {"message": "Book is available. You can borrow directly."},
                status=400
            )

        # 🔴 Prevent duplicate reservation
        already_reserved = Reservation.objects.filter(
            user=request.user,
            book=book,
            status='ACTIVE'
        ).exists()

        if already_reserved:
            return Response(
                {"error": "You already reserved this book"},
                status=400
            )

        Reservation.objects.create(
            user=request.user,
            book=book
        )

        return Response(
            {"message": "Book reserved successfully"},
            status=201
        )
