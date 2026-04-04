from rest_framework import serializers
from .models import Book, ReadingActivity, Bookmarks, ReadingSession


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Book
        fields = [
            "id", "title", "author", "isbn",
            "total_copies", "available_copies",
            "cover_url", "genre",
        ]
        read_only_fields = ["id"]


class ReadingActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ReadingActivity
        fields = [
            "id",
            "book_id",
            "source",
            "book_title",
            "book_author",
            "book_cover",
            "started_at",
            "last_read_at",
            "progress_percent",
            "is_finished",
            "finished_at",
        ]
        read_only_fields = ["id", "started_at", "last_read_at"]


class BookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Bookmarks
        fields = [
            "id",
            "book_id",
            "source",
            "book_title",
            "book_author",
            "book_cover",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ReadingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ReadingSession
        fields = ["id", "date", "minutes_read"]
        read_only_fields = ["id"]