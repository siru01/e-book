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
)

router = DefaultRouter()
router.register(r"books", BookViewSet)

urlpatterns = router.urls + [
    path("openlibrary/search/",    OpenLibrarySearch.as_view(),      name="ol-search"),
    path("openlibrary/import/",    OpenLibraryImport.as_view(),      name="ol-import"),
    path("my-history/",            MyReadingHistoryView.as_view(),   name="my-history"),
    path("my-bookmarks/",          MyBookmarksView.as_view(),        name="my-bookmarks"),
    path("gutenberg/search/",      GutenbergSearchView.as_view(),    name="gutenberg-search"),
    path("gutenberg/import/",      GutenbergImportView.as_view(),    name="gutenberg-import"),
    path("gutenberg/proxy-text/",  GutenbergProxyTextView.as_view(), name="gutenberg-proxy-text"),
]