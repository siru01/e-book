from rest_framework import serializers
from .models import Book, ReadingHistory, Bookmarks


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Book
        fields = [
            "id", "title", "author", "isbn",
            "total_copies", "available_copies",
            "cover_url", "genre",
        ]
        read_only_fields = ["id"]


class ReadingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ReadingHistory
        fields = [
            "id",
            "book_id",       # e.g. "gutenberg:1234" or "google:abc"
            "source",        # "gutenberg" | "openlibrary" | "google" | "archive"
            "finished_at",
        ]
        read_only_fields = ["id", "finished_at"]


class BookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Bookmarks
        fields = [
            "id",
            "book_id",       # e.g "google:abc123"
            "source",        # "openlibrary" | "google"
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]