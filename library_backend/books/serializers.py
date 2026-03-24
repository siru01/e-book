from rest_framework import serializers
from .models import Book, ReadingHistory, Bookmark


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            "id", "title", "author", "isbn",
            "total_copies", "available_copies",
            "cover_url", "genre",
        ]
        read_only_fields = ["id"]


# ── Reading History ──────────────────────────────────────────────────
class ReadingHistorySerializer(serializers.ModelSerializer):
    book_title  = serializers.CharField(source="book.title",     read_only=True)
    book_author = serializers.CharField(source="book.author",    read_only=True)
    book_cover  = serializers.URLField(source="book.cover_url",  read_only=True)
    genre       = serializers.CharField(source="book.genre",     read_only=True)

    class Meta:
        model  = ReadingHistory
        fields = [
            "id",
            "book_title",
            "book_author",
            "book_cover",
            "genre",
            "completed_date",   # DateField  → "2026-02-28"
            "rating",           # int 1-5
        ]


# ── Bookmarks ────────────────────────────────────────────────────────
class BookmarkSerializer(serializers.ModelSerializer):
    book_title  = serializers.CharField(source="book.title",    read_only=True)
    book_author = serializers.CharField(source="book.author",   read_only=True)
    book_cover  = serializers.URLField(source="book.cover_url", read_only=True)

    class Meta:
        model  = Bookmark
        fields = [
            "id",
            "book",             # FK id  (write)
            "book_title",
            "book_author",
            "book_cover",
            "page",
            "note",
            "saved_at",
        ]
        read_only_fields = ["id", "saved_at"]