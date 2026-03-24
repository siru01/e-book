from django.urls import path
from .views import BorrowBookView, ReturnBookView, MyBorrowedBooksView, OverdueTransactionsView, AdminDashboardView,PayFineView

urlpatterns = [
    path('borrow/', BorrowBookView.as_view()),
    path('return/', ReturnBookView.as_view()),
    path('my-books/',MyBorrowedBooksView.as_view()),
    path('overdue/', OverdueTransactionsView.as_view()),
    path('dashboard/', AdminDashboardView.as_view()),
    path('pay-fine/', PayFineView.as_view()),


]
