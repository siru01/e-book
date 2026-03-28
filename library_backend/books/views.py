from django_filters.rest_framework import DjangoFilterBackend
from .services import aggregator
from .permissions import IsAdminOrLibrarianOrReadOnly
from .models import Book, ReadingHistory, Bookmarks
from .serializers import BookSerializer, ReadingHistorySerializer, BookmarkSerializer
from rest_framework import viewsets, status
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from rest_framework.response import Response
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
                isbn     = None
                isbns    = d.get("isbn") or []
                if isbns:
                    isbn = isbns[0]
                cover_id = d.get("cover_i")
                cover    = None
                if isbn:
                    cover = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
                elif cover_id:
                    cover = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
                results.append({
                    "title":              d.get("title"),
                    "author":             (d.get("author_name") or [None])[0],
                    "isbn":               isbn,
                    "cover":              cover,
                    "first_publish_year": d.get("first_publish_year"),
                })
            resp = {"results": results, "num_found": data.get("numFound", 0)}
            self._CACHE[q] = resp
            return Response(resp)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────
# OPEN LIBRARY IMPORT
# ─────────────────────────────────────────────
class OpenLibraryImport(APIView):
    permission_classes = [IsAdminOrLibrarianOrReadOnly]

    def post(self, request):
        payload = request.data or {}
        items   = payload.get("books") or []
        if not items:
            return Response({"error": "books list required"}, status=status.HTTP_400_BAD_REQUEST)
        created = 0
        skipped = 0
        user    = request.user if request.user.is_authenticated else None
        for b in items:
            isbn      = b.get("isbn")
            title     = b.get("title")     or "Untitled"
            author    = b.get("author")    or "Unknown"
            total     = int(b.get("total_copies") or 1)
            available = int(b.get("available_copies") if b.get("available_copies") is not None else total)
            cover     = b.get("cover") or ""
            if not isbn:
                skipped += 1
                continue
            obj, created_flag = Book.objects.get_or_create(
                isbn=isbn,
                defaults={
                    "title":            title,
                    "author":           author,
                    "total_copies":     total,
                    "available_copies": available,
                    "cover_url":        cover,
                    "added_by":         user,
                },
            )
            if created_flag:
                created += 1
        return Response({"created": created, "skipped": skipped})


# ─────────────────────────────────────────────
# READING HISTORY  —  GET/POST /api/my-history/
# ─────────────────────────────────────────────
class MyReadingHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history    = ReadingHistory.objects.filter(user=request.user)
        serializer = ReadingHistorySerializer(history, many=True)
        return Response(serializer.data)

    def post(self, request):
        book_id = request.data.get("book_id")
        source  = request.data.get("source", "gutenberg")
        if not book_id:
            return Response({"error": "book_id required"}, status=400)
        obj, created = ReadingHistory.objects.get_or_create(
            user=request.user,
            book_id=book_id,
            defaults={"source": source},
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookmarks  = Bookmarks.objects.filter(user=request.user)
        serializer = BookmarkSerializer(bookmarks, many=True)
        return Response(serializer.data)

    def post(self, request):
        book_id = request.data.get("book_id")
        source  = request.data.get("source", "gutenberg")
        if not book_id:
            return Response({"error": "book_id required"}, status=400)
        obj, created = Bookmarks.objects.get_or_create(
            user=request.user,
            book_id=book_id,
            defaults={"source": source},
        )
        serializer = BookmarkSerializer(obj)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        book_id    = request.data.get("book_id")
        deleted, _ = Bookmarks.objects.filter(
            user=request.user, book_id=book_id
        ).delete()
        if deleted:
            return Response({"message": "Bookmark removed"})
        return Response({"error": "Bookmark not found"}, status=404)


# ─────────────────────────────────────────────
# BFF AGGREGATOR VIEWS
# ─────────────────────────────────────────────
class BookSearchView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        query   = request.GET.get("q", "").strip()
        page    = int(request.GET.get("page", 1))
        sources = request.GET.get("sources", "").split(",") if request.GET.get("sources") else None
        if not query:
            return Response({"error": "q parameter required"}, status=400)
        results = aggregator.search_all(query, page=page, sources=sources)
        return Response({"results": results, "page": page, "count": len(results)})


class TrendingView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        results = aggregator.trending_all()
        return Response({"results": results, "count": len(results)})


class CategoryView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        genre   = request.GET.get("genre", "fiction")
        page    = int(request.GET.get("page", 1))
        results = aggregator.category_all(genre, page=page)
        return Response({"results": results, "genre": genre, "page": page, "count": len(results)})


class NewArrivalsView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        results = aggregator.new_arrivals_all()
        return Response({"results": results, "count": len(results)})


# ─────────────────────────────────────────────
# BOOK TEXT PROXY  — GET /api/books/read/
# Returns { title, author, cover_url, text, source }
# ─────────────────────────────────────────────
class BookReadView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        book_id = request.GET.get("book_id", "").strip()
        if not book_id:
            return Response({"error": "book_id required"}, status=400)

        if ":" in book_id:
            source, raw_id = book_id.split(":", 1)
        else:
            source = "gutenberg"
            raw_id = book_id

        try:
            if source == "gutenberg":
                return self._fetch_gutenberg(raw_id)
            elif source == "archive":
                return self._fetch_archive(raw_id)
            elif source == "openlibrary":
                return self._fetch_openlibrary(raw_id)
            elif source == "google":
                return self._fetch_google(raw_id)
            else:
                return Response({"error": f"Unknown source: {source}"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def _fetch_gutenberg(self, gutenberg_id):
        r = httpx.get(f"https://gutendex.com/books/{gutenberg_id}", timeout=15)
        r.raise_for_status()
        b         = r.json()
        fmts      = b.get("formats", {})
        plain_url = (
            fmts.get("text/plain; charset=utf-8") or
            fmts.get("text/plain; charset=us-ascii") or
            fmts.get("text/plain") or ""
        )
        cover_url = fmts.get("image/jpeg", "")
        authors   = b.get("authors", [])
        author    = authors[0].get("name", "Unknown") if authors else "Unknown"

        if not plain_url:
            return Response({"error": "No plain text available for this Gutenberg book."}, status=404)

        text_r = httpx.get(plain_url, timeout=20, follow_redirects=True)
        text_r.raise_for_status()
        return Response({
            "title":     b.get("title", "Untitled"),
            "author":    author,
            "cover_url": cover_url,
            "source":    "gutenberg",
            "text":      text_r.text[:300000],
        })

    def _fetch_archive(self, identifier):
        meta_r = httpx.get(f"https://archive.org/metadata/{identifier}", timeout=15)
        meta_r.raise_for_status()
        meta      = meta_r.json()
        m         = meta.get("metadata", {})
        title     = m.get("title", "Untitled")
        creator   = m.get("creator", "Unknown")
        cover_url = f"https://archive.org/services/img/{identifier}"

        files     = meta.get("files", [])
        text_file = None
        for f in files:
            name = f.get("name", "")
            if name.endswith("_djvu.txt") or name.endswith(".txt"):
                text_file = name
                break

        if not text_file:
            stream_url = f"https://archive.org/stream/{identifier}/{identifier}_djvu.txt"
            try:
                text_r = httpx.get(stream_url, timeout=20, follow_redirects=True)
                text_r.raise_for_status()
                return Response({
                    "title": title, "author": creator,
                    "cover_url": cover_url, "source": "archive",
                    "text": text_r.text[:300000],
                })
            except Exception:
                return Response({"error": "No readable text found for this Archive.org book."}, status=404)

        text_url = f"https://archive.org/download/{identifier}/{text_file}"
        text_r   = httpx.get(text_url, timeout=20, follow_redirects=True)
        text_r.raise_for_status()
        return Response({
            "title": title, "author": creator,
            "cover_url": cover_url, "source": "archive",
            "text": text_r.text[:300000],
        })

    def _fetch_openlibrary(self, ol_id):
        work_r = httpx.get(f"https://openlibrary.org/works/{ol_id}.json", timeout=15)
        work_r.raise_for_status()
        work      = work_r.json()
        title     = work.get("title", "Untitled")
        cover_id  = work.get("covers", [None])[0]
        cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else ""

        author = "Unknown"
        try:
            author_key = work.get("authors", [{}])[0].get("author", {}).get("key", "")
            if author_key:
                a_r    = httpx.get(f"https://openlibrary.org{author_key}.json", timeout=10)
                author = a_r.json().get("name", "Unknown")
        except Exception:
            pass

        editions_r = httpx.get(
            f"https://openlibrary.org/works/{ol_id}/editions.json?limit=10",
            timeout=15
        )
        editions_r.raise_for_status()
        editions = editions_r.json().get("entries", [])

        ia_id = None
        for ed in editions:
            ia_ids = ed.get("ocaid") or ed.get("ia") or []
            if isinstance(ia_ids, str):
                ia_ids = [ia_ids]
            if ia_ids:
                ia_id = ia_ids[0]
                break

        if not ia_id:
            return Response({
                "error": "No free readable version found for this Open Library book.",
                "title": title, "author": author, "cover_url": cover_url,
            }, status=404)

        return self._fetch_archive(ia_id)

    def _fetch_google(self, google_id):
        from django.conf import settings
        params  = {}
        api_key = getattr(settings, "GOOGLE_BOOKS_API_KEY", "")
        if api_key:
            params["key"] = api_key

        r = httpx.get(
            f"https://www.googleapis.com/books/v1/volumes/{google_id}",
            params=params, timeout=15
        )
        r.raise_for_status()
        item      = r.json()
        info      = item.get("volumeInfo", {})
        title     = info.get("title", "Untitled")
        authors   = info.get("authors", ["Unknown"])
        author    = authors[0] if authors else "Unknown"
        cover_url = info.get("imageLinks", {}).get("thumbnail", "").replace("http://", "https://")
        access    = item.get("accessInfo", {})

        download_url = (
            access.get("epub", {}).get("downloadLink") or
            access.get("pdf",  {}).get("downloadLink") or ""
        )
        if download_url:
            try:
                text_r = httpx.get(download_url, timeout=20, follow_redirects=True)
                text_r.raise_for_status()
                return Response({
                    "title": title, "author": author,
                    "cover_url": cover_url, "source": "google",
                    "text": text_r.text[:300000],
                })
            except Exception:
                pass

        # Fallback: description as preview
        description  = info.get("description", "")
        preview_text = (
            f"{title}\nby {author}\n\n{'─' * 40}\n\n"
            f"{description}\n\n{'─' * 40}\n\n"
            f"Full text not available (may be under copyright).\n"
            f"Visit: https://books.google.com/books?id={google_id}"
        )
        return Response({
            "title": title, "author": author,
            "cover_url": cover_url, "source": "google",
            "text": preview_text,
        })