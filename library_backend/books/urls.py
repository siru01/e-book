from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    BookViewSet,
    OpenLibrarySearch,
    OpenLibraryImport,
    MyReadingHistoryView,
    MyBookmarksView,
    GutenbergSearchView,
    GutenbergImportView,
    GutenbergProxyTextView,
    BookSearchView,
    TrendingView,
    CategoryView,
    NewArrivalsView,
)

router = DefaultRouter()
router.register(r"books", BookViewSet)

urlpatterns = [
    path("books/search/",       BookSearchView.as_view(),  name="book-search"),
    path("books/trending/",     TrendingView.as_view(),    name="book-trending"),
    path("books/category/",     CategoryView.as_view(),    name="book-category"),
    path("books/new-arrivals/", NewArrivalsView.as_view(), name="book-new-arrivals"),
    path("openlibrary/search/",   OpenLibrarySearch.as_view(),      name="ol-search"),
    path("openlibrary/import/",   OpenLibraryImport.as_view(),      name="ol-import"),
    path("my-history/",           MyReadingHistoryView.as_view(),   name="my-history"),
    path("my-bookmarks/",         MyBookmarksView.as_view(),        name="my-bookmarks"),
    path("gutenberg/search/",     GutenbergSearchView.as_view(),    name="gutenberg-search"),
    path("gutenberg/import/",     GutenbergImportView.as_view(),    name="gutenberg-import"),
    path("gutenberg/proxy-text/", GutenbergProxyTextView.as_view(), name="gutenberg-proxy-text"),
] + router.urls   # ← router LAST