from django.db import models
from users.models import User


SOURCE_CHOICES = [
    ('gutenberg',   'Gutenberg'),
    ('openlibrary', 'Open Library'),
    ('google',      'Google Books'),
    ('archive',     'Internet Archive'),
]


class Book(models.Model):
    """
    Kept for backwards compatibility with any existing DB rows/migrations.
    New book data comes from external APIs — not stored here.
    """
    title           = models.CharField(max_length=200)
    author          = models.CharField(max_length=200)
    isbn            = models.CharField(max_length=20, unique=True)
    total_copies    = models.IntegerField(default=1)
    available_copies = models.IntegerField(default=1)
    cover_url       = models.URLField(blank=True, null=True)
    genre           = models.CharField(max_length=100, blank=True, default="General")
    gutenberg_id    = models.IntegerField(null=True, blank=True, unique=True)
    read_url        = models.URLField(blank=True, null=True)
    added_by        = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.title


class ReadingHistory(models.Model):
    user        = models.ForeignKey(User, on_delete=models.CASCADE)
    book_id     = models.CharField(max_length=255, default='gutenberg:0')  # ← add default
    source      = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='gutenberg')
    finished_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'book_id')

    def __str__(self):
        return f"{self.user.email} finished {self.book_id}"


class Bookmarks(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    book_id    = models.CharField(max_length=255, default='gutenberg:0')   # ← add default
    source     = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='gutenberg')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'book_id')

    def __str__(self):
        return f"{self.user.email} bookmarked {self.book_id}"
