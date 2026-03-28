from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    BookViewSet,
    OpenLibrarySearch,
    OpenLibraryImport,
    MyReadingHistoryView,
    MyBookmarksView,
    BookSearchView,
    TrendingView,
    CategoryView,
    NewArrivalsView,
    BookReadView,
)

router = DefaultRouter()
router.register(r"books", BookViewSet)

urlpatterns = [
    # ── BFF book endpoints ────────────────────────────────────
    path("books/read/",         BookReadView.as_view(),    name="book-read"),
    path("books/search/",       BookSearchView.as_view(),  name="book-search"),
    path("books/trending/",     TrendingView.as_view(),    name="book-trending"),
    path("books/category/",     CategoryView.as_view(),    name="book-category"),
    path("books/new-arrivals/", NewArrivalsView.as_view(), name="book-new-arrivals"),

    # ── User data ─────────────────────────────────────────────
    path("my-history/",    MyReadingHistoryView.as_view(), name="my-history"),
    path("my-bookmarks/",  MyBookmarksView.as_view(),      name="my-bookmarks"),

    # ── Open Library import (admin feature) ───────────────────
    path("openlibrary/search/", OpenLibrarySearch.as_view(), name="ol-search"),
    path("openlibrary/import/", OpenLibraryImport.as_view(), name="ol-import"),
] + router.urls