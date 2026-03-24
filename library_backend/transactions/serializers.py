from rest_framework import serializers
from .models import Transaction


class MyBorrowedBooksSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author', read_only=True)
    book_isbn = serializers.CharField(source='book.isbn', read_only=True)

    # Best-effort cover URL (uses Open Library Covers by ISBN when available)
    book_cover = serializers.SerializerMethodField()

    days_remaining = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id',
            'book_title',
            'book_author',
            'book_isbn',
            'book_cover',
            'issue_date',
            'due_date',
            'days_remaining',
            'is_overdue'
        ]

    def get_days_remaining(self, obj):
        from django.utils import timezone
        delta = obj.due_date - timezone.now()
        return delta.days

    def get_is_overdue(self, obj):
        from django.utils import timezone
        return timezone.now() > obj.due_date

    def get_book_cover(self, obj):
        isbn = getattr(obj.book, 'isbn', None)
        if isbn:
            # OpenLibrary cover service - returns image if found
            return f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
        return None


class OverdueTransactionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    book_title = serializers.CharField(source='book.title', read_only=True)

    days_overdue = serializers.SerializerMethodField()
    calculated_fine = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id',
            'user_email',
            'book_title',
            'due_date',
            'days_overdue',
            'calculated_fine'
        ]

    def get_days_overdue(self, obj):
        from django.utils import timezone
        if timezone.now() > obj.due_date:
            return (timezone.now() - obj.due_date).days
        return 0

    def get_calculated_fine(self, obj):
        from django.utils import timezone
        if timezone.now() > obj.due_date:
            days = (timezone.now() - obj.due_date).days
            return days * 5
        return 0
