from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    BookViewSet,
    OpenLibrarySearch,
    OpenLibraryImport,
    MyActivityView,
    MyFinishedView,
    MyBookmarksView,
    MySessionsView,
    BookSearchView,
    TrendingView,
    CategoryView,
    NewArrivalsView,
    BookReadView,
    DashboardSummaryView,
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
    path("my-activity/",   MyActivityView.as_view(),   name="my-activity"),
    path("my-finished/",   MyFinishedView.as_view(),   name="my-finished"),
    path("my-bookmarks/",  MyBookmarksView.as_view(),  name="my-bookmarks"),
    path("my-sessions/",   MySessionsView.as_view(),   name="my-sessions"),
    path("my-activity-summary/", DashboardSummaryView.as_view(), name="my-activity-summary"),

    # ── Open Library import (admin feature) ───────────────────
    path("openlibrary/search/", OpenLibrarySearch.as_view(), name="ol-search"),
    path("openlibrary/import/", OpenLibraryImport.as_view(), name="ol-import"),
] + router.urls