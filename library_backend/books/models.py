from django.db import models
from users.models import User


SOURCE_CHOICES = [
    ('gutenberg',   'Gutenberg'),
    ('openlibrary', 'Open Library'),
    ('google',      'Google Books'),
    ('archive',     'Internet Archive'),
]


class Book(models.Model):
    """Legacy model kept for admin/backward compat. New book data comes from external APIs."""
    title            = models.CharField(max_length=200)
    author           = models.CharField(max_length=200)
    isbn             = models.CharField(max_length=20, unique=True)
    total_copies     = models.IntegerField(default=1)
    available_copies = models.IntegerField(default=1)
    cover_url        = models.URLField(blank=True, null=True)
    genre            = models.CharField(max_length=100, blank=True, default="General")
    read_url         = models.URLField(blank=True, null=True)
    added_by         = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
    )

    def __str__(self):
        return self.title


class GutenbergIndex(models.Model):
    """
    Local cache of Gutenberg book metadata for instant search results.
    """
    gut_id      = models.IntegerField(unique=True)
    title       = models.CharField(max_length=500, blank=True)
    authors     = models.JSONField(default=list)  # List of strings
    cover_url   = models.URLField(blank=True, default='')
    read_url    = models.URLField(blank=True, default='')
    subjects    = models.JSONField(default=list)
    bookshelves = models.JSONField(default=list)
    download_count = models.IntegerField(default=0)
    indexed_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-download_count']
        indexes  = [
            models.Index(fields=['title']),
        ]

    def __str__(self):
        return f"Gutenberg:{self.gut_id} | {self.title}"


class ReadingActivity(models.Model):
    """
    Unified reading tracker — covers both 'currently reading' and 'finished'.
    Created/updated whenever the user opens or finishes a book.
    Caches title/author/cover so panels load instantly (no extra API calls).
    """
    user             = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    book_id          = models.CharField(max_length=255)          # e.g. "openlibrary:OL123W"
    source           = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='openlibrary')
    book_title       = models.CharField(max_length=500, blank=True, default='')
    book_author      = models.CharField(max_length=300, blank=True, default='')
    book_cover       = models.URLField(blank=True, default='')
    started_at       = models.DateTimeField(auto_now_add=True)
    last_read_at     = models.DateTimeField(auto_now=True)
    progress_percent = models.FloatField(default=0.0)            # 0.0 – 100.0
    is_finished      = models.BooleanField(default=False)
    finished_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'book_id')
        ordering = ['-last_read_at']

    def __str__(self):
        return f"{self.user.email} → {self.book_title or self.book_id}"


class Bookmarks(models.Model):
    """
    User bookmarks — stores cached title/author so the panel can render without API calls.
    """
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarks')
    book_id      = models.CharField(max_length=255)
    source       = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='openlibrary')
    book_title   = models.CharField(max_length=500, blank=True, default='')
    book_author  = models.CharField(max_length=300, blank=True, default='')
    book_cover   = models.URLField(blank=True, default='')
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'book_id')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} bookmarked {self.book_title or self.book_id}"


class ReadingSession(models.Model):
    """
    One row per user per calendar date — tracks reading time in minutes.
    Used to build the GitHub-style heatmap on the dashboard.
    Posted from the Reader page via a periodic heartbeat (every ~60 s).
    """
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    date         = models.DateField()                            # local date of the session
    minutes_read = models.PositiveIntegerField(default=0)        # accumulated minutes for that day

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.email} | {self.date} | {self.minutes_read} min"
