from django.db import models
from users.models import User


class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=200)
    isbn = models.CharField(max_length=20, unique=True)
    total_copies = models.IntegerField(default=1)
    available_copies = models.IntegerField(default=1)
    cover_url = models.URLField(blank=True, null=True)
    genre = models.CharField(max_length=100, blank=True, default="General")
    # Project Gutenberg integration
    gutenberg_id = models.IntegerField(null=True, blank=True, unique=True)
    read_url = models.URLField(blank=True, null=True)  # direct HTML read link
    # FIX: SET_NULL + null/blank so GutenbergImportView never crashes
    # when added_by is None or user is unauthenticated
    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.title


class ReadingHistory(models.Model):
    """Tracks every book a user has finished reading."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reading_history")
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    completed_date = models.DateField(auto_now_add=True)
    rating = models.IntegerField(default=4)  # 1–5 stars

    class Meta:
        ordering = ["-completed_date"]
        unique_together = ("user", "book")  # one history entry per book per user

    def __str__(self):
        return f"{self.user.email} finished {self.book.title}"


class Bookmark(models.Model):
    """Saves a user's bookmark position inside a book."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookmarks")
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    page = models.IntegerField(default=1)
    note = models.CharField(max_length=300, blank=True, default="")
    saved_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-saved_at"]
        unique_together = ("user", "book")  # one bookmark per book per user

    def __str__(self):
        return f"{self.user.email} — {self.book.title} p.{self.page}"