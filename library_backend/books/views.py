from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .permissions import IsAdminOrLibrarianOrReadOnly
from .models import Book, ReadingHistory, Bookmark
from .serializers import BookSerializer, ReadingHistorySerializer, BookmarkSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
import httpx


# ─────────────────────────────────────────────
# BOOKS VIEWSET
# ─────────────────────────────────────────────
class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().order_by("-id")
    serializer_class = BookSerializer
    permission_classes = [IsAdminOrLibrarianOrReadOnly]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["title", "author", "isbn"]
    filterset_fields = {
        "author": ["exact", "icontains"],
        "available_copies": ["gte", "lte"],
        "total_copies": ["gte", "lte"],
    }
    ordering_fields = ["title", "available_copies", "total_copies", "id"]
    ordering = ["-id"]

    def perform_create(self, serializer):
        # FIX: added_by is now nullable so this is safe even if user is anon
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(added_by=user)


# ─────────────────────────────────────────────
# OPEN LIBRARY SEARCH
# ─────────────────────────────────────────────
class OpenLibrarySearch(APIView):
    permission_classes = [AllowAny]
    _CACHE = {}

    def get(self, request):
        q = request.query_params.get("q")
        if not q:
            return Response(
                {"error": "query parameter 'q' required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cached = self._CACHE.get(q)
        if cached:
            return Response(cached)

        params = {"q": q, "limit": request.query_params.get("limit", 20)}
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.get("https://openlibrary.org/search.json", params=params)
            r.raise_for_status()
            data = r.json()
            docs = data.get("docs", [])
            results = []
            for d in docs:
                isbn = None
                isbns = d.get("isbn") or []
                if isbns:
                    isbn = isbns[0]
                cover_id = d.get("cover_i")
                cover = None
                if isbn:
                    cover = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
                elif cover_id:
                    cover = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
                results.append(
                    {
                        "title": d.get("title"),
                        "author": (d.get("author_name") or [None])[0],
                        "isbn": isbn,
                        "cover": cover,
                        "first_publish_year": d.get("first_publish_year"),
                    }
                )
            resp = {"results": results, "num_found": data.get("numFound", 0)}
            try:
                self._CACHE[q] = resp
            except Exception:
                pass
            return Response(resp)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ─────────────────────────────────────────────
# OPEN LIBRARY IMPORT
# ─────────────────────────────────────────────
class OpenLibraryImport(APIView):
    permission_classes = [IsAdminOrLibrarianOrReadOnly]

    def post(self, request):
        payload = request.data or {}
        items = payload.get("books") or []
        if not items:
            return Response(
                {"error": "books list required"}, status=status.HTTP_400_BAD_REQUEST
            )
        created = 0
        skipped = 0
        # FIX: added_by is nullable — safe to pass None
        user = request.user if request.user.is_authenticated else None
        for b in items:
            isbn = b.get("isbn")
            title = b.get("title") or "Untitled"
            author = b.get("author") or "Unknown"
            total = int(b.get("total_copies") or 1)
            available = int(
                b.get("available_copies")
                if b.get("available_copies") is not None
                else total
            )
            cover = b.get("cover") or ""
            if not isbn:
                skipped += 1
                continue
            obj, created_flag = Book.objects.get_or_create(
                isbn=isbn,
                defaults={
                    "title": title,
                    "author": author,
                    "total_copies": total,
                    "available_copies": available,
                    "cover_url": cover,
                    "added_by": user,
                },
            )
            if created_flag:
                created += 1
        return Response({"created": created, "skipped": skipped})


# ─────────────────────────────────────────────
# READING HISTORY  —  GET /api/my-history/
# ─────────────────────────────────────────────
class MyReadingHistoryView(APIView):
    """
    GET  — returns all books the logged-in user has marked as finished.
    POST — marks a book as finished (or updates rating).
           body: { "book_id": <int>, "rating": <1-5> }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = ReadingHistory.objects.filter(user=request.user)
        serializer = ReadingHistorySerializer(history, many=True)
        return Response(serializer.data)

    def post(self, request):
        book_id = request.data.get("book_id")
        rating  = int(request.data.get("rating", 4))

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=404)

        obj, created = ReadingHistory.objects.update_or_create(
            user=request.user,
            book=book,
            defaults={"rating": rating},
        )
        serializer = ReadingHistorySerializer(obj)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────
# BOOKMARKS  —  GET/POST/DELETE /api/my-bookmarks/
# ─────────────────────────────────────────────
class MyBookmarksView(APIView):
    """
    GET    — returns all bookmarks for the logged-in user.
    POST   — create or update a bookmark.
             body: { "book_id": <int>, "page": <int>, "note": "<str>" }
    DELETE — remove a bookmark.
             body: { "book_id": <int> }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookmarks = Bookmark.objects.filter(user=request.user)
        serializer = BookmarkSerializer(bookmarks, many=True)
        return Response(serializer.data)

    def post(self, request):
        book_id = request.data.get("book_id")
        page    = int(request.data.get("page", 1))
        note    = request.data.get("note", "")

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({"error": "Book not found"}, status=404)

        obj, created = Bookmark.objects.update_or_create(
            user=request.user,
            book=book,
            defaults={"page": page, "note": note},
        )
        serializer = BookmarkSerializer(obj)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        book_id = request.data.get("book_id")
        deleted, _ = Bookmark.objects.filter(
            user=request.user, book_id=book_id
        ).delete()
        if deleted:
            return Response({"message": "Bookmark removed"})
        return Response({"error": "Bookmark not found"}, status=404)


# ─────────────────────────────────────────────
# GUTENBERG SEARCH  — GET /api/gutenberg/search/
# ─────────────────────────────────────────────
_GUTENBERG_CACHE = {}

def _extract_gutenberg_book(book: dict) -> dict:
    """Normalise a Gutendex book object into a flat dict for the frontend."""
    formats = book.get("formats", {})

    read_url = (
        formats.get("text/html")
        or formats.get("text/html; charset=utf-8")
        or formats.get("text/html; charset=us-ascii")
        or formats.get("text/plain; charset=utf-8")
        or formats.get("text/plain")
        or ""
    )

    cover = formats.get("image/jpeg") or ""

    authors = book.get("authors", [])
    author_name = authors[0].get("name", "Unknown") if authors else "Unknown"

    subjects = book.get("subjects", [])
    genre = subjects[0][:50] if subjects else "General"

    return {
        "gutenberg_id":   book.get("id"),
        "title":          book.get("title", "Untitled"),
        "author":         author_name,
        "cover":          cover,
        "subjects":       subjects[:5],
        "genre":          genre,
        "read_url":       read_url,
        "download_count": book.get("download_count", 0),
    }


class GutenbergSearchView(APIView):
    """Proxy search to Gutendex (Project Gutenberg).
    GET /api/gutenberg/search/?q=<query>&subject=<topic>&page=<n>
    """
    permission_classes = [AllowAny]

    def get(self, request):
        q       = request.query_params.get("q", "")
        subject = request.query_params.get("subject", "")
        page    = request.query_params.get("page", "1")

        cache_key = f"{q}|{subject}|{page}"
        if cache_key in _GUTENBERG_CACHE:
            return Response(_GUTENBERG_CACHE[cache_key])

        params = {"page": page}
        if q:
            params["search"] = q
        if subject:
            params["topic"] = subject

        try:
            with httpx.Client(timeout=15.0) as client:
                r = client.get("https://gutendex.com/books/", params=params)
            r.raise_for_status()
            data = r.json()
            results = [_extract_gutenberg_book(b) for b in data.get("results", [])]
            resp = {"results": results, "count": data.get("count", 0)}
            _GUTENBERG_CACHE[cache_key] = resp
            return Response(resp)
        except httpx.TimeoutException:
            return Response({"error": "Gutendex timed out", "results": []}, status=200)
        except httpx.ConnectError:
            return Response({"error": "Cannot reach Gutendex", "results": []}, status=200)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e), "results": []}, status=200)


# ─────────────────────────────────────────────
# GUTENBERG IMPORT  — POST /api/gutenberg/import/
# ─────────────────────────────────────────────
class GutenbergImportView(APIView):
    """Import a Gutenberg book into the local Book DB."""
    permission_classes = [IsAdminOrLibrarianOrReadOnly]

    def post(self, request):
        data         = request.data or {}
        gutenberg_id = data.get("gutenberg_id")
        if not gutenberg_id:
            return Response({"error": "gutenberg_id required"}, status=400)

        # FIX: always use request.user directly — permission class guarantees
        # only authenticated admin/librarian reaches here
        user = request.user if request.user.is_authenticated else None

        synthetic_isbn = f"GUT-{gutenberg_id}"

        obj, created = Book.objects.get_or_create(
            gutenberg_id=gutenberg_id,
            defaults={
                "title":            data.get("title", "Untitled"),
                "author":           data.get("author", "Unknown"),
                "isbn":             synthetic_isbn,
                "total_copies":     999,
                "available_copies": 999,
                "cover_url":        data.get("cover", ""),
                "genre":            data.get("genre", "General"),
                "read_url":         data.get("read_url", ""),
                "added_by":         user,
            },
        )
        return Response(
            {"created": created, "book_id": obj.id},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )