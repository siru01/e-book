import re
from datetime import timedelta, date as date_type
from concurrent.futures import ThreadPoolExecutor
from django.db import close_old_connections

from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .services import aggregator
from .permissions import IsAdminOrLibrarianOrReadOnly
from .models import Book, ReadingActivity, Bookmarks, ReadingSession
from .serializers import (
    BookSerializer,
    ReadingActivitySerializer,
    BookmarkSerializer,
    ReadingSessionSerializer,
)
from rest_framework import viewsets, status
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.cache import cache
import httpx

SHELF_CACHE_TTL = 60 * 60 * 24 * 7  # 7 Days (604,800 seconds)


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
# READING ACTIVITY  —  GET/POST /api/my-activity/
# ─────────────────────────────────────────────
class MyActivityView(APIView):
    """
    GET  → last 8 reading activities (most recently read first)
    POST → upsert an activity (create on first open, update on page turn / finish)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        activities = ReadingActivity.objects.filter(
            user=request.user
        ).order_by('-last_read_at')[:6]
        serializer = ReadingActivitySerializer(activities, many=True)
        return Response(serializer.data)

    def post(self, request):
        book_id      = request.data.get("book_id", "").strip()
        source       = request.data.get("source", "openlibrary")
        book_title   = request.data.get("book_title", "")
        book_author  = request.data.get("book_author", "")
        book_cover   = request.data.get("book_cover", "")
        progress     = float(request.data.get("progress_percent", 0))
        is_finished  = bool(request.data.get("is_finished", False))

        if not book_id:
            return Response({"error": "book_id required"}, status=400)

        obj, created = ReadingActivity.objects.get_or_create(
            user=request.user,
            book_id=book_id,
            defaults={
                "source":       source,
                "book_title":   book_title,
                "book_author":  book_author,
                "book_cover":   book_cover,
                "progress_percent": progress,
                "is_finished":  is_finished,
                "finished_at":  timezone.now() if is_finished else None,
            },
        )

        if not created:
            # Update fields — always refresh metadata + progress
            if book_title:  obj.book_title  = book_title
            if book_author: obj.book_author = book_author
            if book_cover:  obj.book_cover  = book_cover
            obj.progress_percent = progress
            
            # Use just the new value to decide if we need to mark finished
            if is_finished and not obj.is_finished:
                obj.finished_at = timezone.now()
            obj.is_finished = is_finished
            obj.save()

        # Invalidate dashboard summary cache
        cache.delete(f"user_summary_{request.user.id}")

        serializer = ReadingActivitySerializer(obj)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────
# FINISHED BOOKS  —  GET /api/my-finished/
# ─────────────────────────────────────────────
class MyFinishedView(APIView):
    """Returns only the books the user has marked as finished."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        finished = ReadingActivity.objects.filter(
            user=request.user,
            is_finished=True,
        ).order_by('-finished_at')[:8]
        serializer = ReadingActivitySerializer(finished, many=True)
        return Response(serializer.data)


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
        book_id     = request.data.get("book_id", "").strip()
        source      = request.data.get("source", "openlibrary")
        book_title  = request.data.get("book_title", "")
        book_author = request.data.get("book_author", "")
        book_cover  = request.data.get("book_cover", "")

        if not book_id:
            return Response({"error": "book_id required"}, status=400)

        obj, created = Bookmarks.objects.get_or_create(
            user=request.user,
            book_id=book_id,
            defaults={
                "source":      source,
                "book_title":  book_title,
                "book_author": book_author,
                "book_cover":  book_cover,
            },
        )

        if not created and (book_title or book_author or book_cover):
            # Backfill metadata if missing
            if book_title and not obj.book_title:   obj.book_title  = book_title
            if book_author and not obj.book_author: obj.book_author = book_author
            if book_cover and not obj.book_cover:   obj.book_cover  = book_cover
            obj.save()

        # Invalidate cache
        cache.delete(f"user_summary_{request.user.id}")

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
            cache.delete(f"user_summary_{request.user.id}")
            return Response({"message": "Bookmark removed"})
        return Response({"error": "Bookmark not found"}, status=404)


# ─────────────────────────────────────────────
# DASHBOARD SUMMARY (BFF) — GET /api/my-activity-summary/
# ─────────────────────────────────────────────
class DashboardSummaryView(APIView):
    """
    Returns a unified object for the dashboard to reduce API calls.
    Includes: bookmarks, activity, finished books, sessions, and streak.
    Parallel fetching + caching optimization.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        cache_key = f"user_summary_{user.id}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        since = date_type.today() - timedelta(days=364)

        def get_activities():
            close_old_connections()
            qs = ReadingActivity.objects.filter(user=user).order_by('-last_read_at')[:15]
            return ReadingActivitySerializer(qs, many=True).data

        def get_finished():
            close_old_connections()
            qs = ReadingActivity.objects.filter(user=user, is_finished=True).order_by('-finished_at')[:8]
            return ReadingActivitySerializer(qs, many=True).data

        def get_bookmarks():
            close_old_connections()
            qs = Bookmarks.objects.filter(user=user)
            return BookmarkSerializer(qs, many=True).data

        def get_sessions_and_streak():
            close_old_connections()
            qs_list = list(ReadingSession.objects.filter(user=user, date__gte=since).order_by('date'))
            serial_data = ReadingSessionSerializer(qs_list, many=True).data
            
            # Streak calculation
            session_dates = set(s.date for s in qs_list)
            streak = 0
            current_check = date_type.today()
            if current_check in session_dates or (current_check - timedelta(days=1)) in session_dates:
                test_day = current_check if current_check in session_dates else current_check - timedelta(days=1)
                while test_day in session_dates:
                    streak += 1
                    test_day -= timedelta(days=1)
            return serial_data, streak

        with ThreadPoolExecutor(max_workers=4) as executor:
            f_act = executor.submit(get_activities)
            f_fin = executor.submit(get_finished)
            f_bmk = executor.submit(get_bookmarks)
            f_ses = executor.submit(get_sessions_and_streak)

            payload = {
                "activity": f_act.result(),
                "finished": f_fin.result(),
                "bookmarks": f_bmk.result(),
                "sessions": f_ses.result()[0],
                "streak": f_ses.result()[1],
            }

        cache.set(cache_key, payload, 300) # 5 min cache
        return Response(payload)


# ─────────────────────────────────────────────
# READING SESSIONS HEARTBEAT — POST /api/my-sessions/
# ─────────────────────────────────────────────
class MySessionsView(APIView):
    """
    POST → add N minutes to today's session (heartbeat from Reader page).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        minutes = int(request.data.get("minutes", 1))
        today   = date_type.today()

        obj, created = ReadingSession.objects.get_or_create(
            user=request.user,
            date=today,
            defaults={"minutes_read": minutes},
        )
        if not created:
            obj.minutes_read += minutes
            obj.save()

        # Invalidate cache
        cache.delete(f"user_summary_{request.user.id}")

        serializer = ReadingSessionSerializer(obj)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────
# BFF AGGREGATOR VIEWS
# ─────────────────────────────────────────────
class BookSearchView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        query = request.GET.get("q", "").strip()
        if not query:
            return Response({"error": "q parameter required"}, status=400)

        cache_key = f"shelf:search:{query.lower()}"
        cached    = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        results = aggregator.search_all(query)
        payload = {"results": results, "count": len(results)}

        if results:
            cache.set(cache_key, payload, 60 * 30)

        return Response(payload)


class TrendingView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        cache_key = "shelf:trending"
        cached    = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        results = aggregator.trending_all()
        payload = {"results": results, "count": len(results)}
        cache.set(cache_key, payload, SHELF_CACHE_TTL)
        return Response(payload)


class CategoryView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        genre     = request.GET.get("genre", "fiction").strip()
        page      = int(request.GET.get("page", 1))
        cache_key = f"shelf:category:{genre}:page:{page}"
        cached    = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        results = aggregator.category_all(genre, page=page)
        payload = {"results": results, "genre": genre, "page": page, "count": len(results)}
        cache.set(cache_key, payload, SHELF_CACHE_TTL)
        return Response(payload)


class ShelfRowsView(APIView):
    """
    BFF Aggregator: Returns multiple shelf rows in one single request.
    Greatly improves initial dashboard load time by reducing network round-trips.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        cache_key = "shelf:all_rows:v2"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        # Define the shelves we want on the dashboard
        shelves_to_fetch = [
            {"label": "Trending Classics", "type": "trending"},
            {"label": "Classic Literature", "genre": "literature"},
            {"label": "Science Fiction",    "genre": "science fiction"},
            {"label": "Mystery & Ghost",    "genre": "mystery"},
            {"label": "Philosophy & Zen",   "genre": "philosophy"},
        ]

        rows = aggregator.fetch_all_shelves(shelves_to_fetch)
        cache.set(cache_key, rows, SHELF_CACHE_TTL)
        
        return Response(rows)


class NewArrivalsView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def get(self, request):
        cache_key = "shelf:new-arrivals"
        cached    = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        results = aggregator.new_arrivals_all()
        payload = {"results": results, "count": len(results)}
        cache.set(cache_key, payload, SHELF_CACHE_TTL)
        return Response(payload)


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
# BOOK TEXT PROXY  — GET /api/books/read/
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
            # Fetch user progress if authenticated
            user_progress = 0.0
            is_faved = False
            is_done  = False
            user = request.user
            if user and user.is_authenticated:
                act = ReadingActivity.objects.filter(user=user, book_id=book_id).first()
                if act:
                    user_progress = act.progress_percent
                    is_done = act.is_finished
                is_faved = Bookmarks.objects.filter(user=user, book_id=book_id).exists()

            if source == "gutenberg":
                resp = self._fetch_gutenberg(raw_id)
            elif source == "archive":
                resp = self._fetch_archive(raw_id)
            elif source == "openlibrary":
                resp = self._fetch_openlibrary(raw_id)
            elif source == "google":
                resp = self._fetch_google(raw_id)
            else:
                return Response(
                    {"error": f"Unknown source: {source}. Supported: gutenberg, openlibrary, google, archive"},
                    status=400
                )
            
            # Inject user metadata into the response
            resp.data["user_progress"] = user_progress
            resp.data["is_bookmarked"] = is_faved
            resp.data["is_finished"]   = is_done
            return resp

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def _fetch_gutenberg(self, gutenberg_id: str):
        try:
            meta_r = httpx.get(
                f"https://gutendex.com/books/{gutenberg_id}",
                timeout=10,
                follow_redirects=True
            )
            meta_r.raise_for_status()
            meta        = meta_r.json()
            title       = meta.get("title", f"Book #{gutenberg_id}")
            authors     = meta.get("authors", [])
            author      = authors[0].get("name", "Unknown") if authors else "Unknown"
            formats     = meta.get("formats", {})
            cover_url   = formats.get("image/jpeg", "")
            subjects    = meta.get("subjects",    [])[:8]
            bookshelves = meta.get("bookshelves", [])[:8]
            text_url    = (
                formats.get("text/plain; charset=utf-8") or
                formats.get("text/plain; charset=us-ascii") or
                formats.get("text/plain") or
                ""
            )
        except Exception:
            title       = f"Project Gutenberg Book #{gutenberg_id}"
            author      = "Unknown"
            cover_url   = ""
            subjects    = []
            bookshelves = []
            text_url    = ""

        text_urls = list(filter(None, [
            text_url,
            f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.txt",
            f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}-0.txt",
            f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}.txt",
        ]))

        text = None
        for url in text_urls:
            try:
                t_r = httpx.get(url, timeout=20, follow_redirects=True)
                if t_r.status_code == 200:
                    text = t_r.text[:300000]
                    break
            except Exception:
                continue

        if text is None:
            text = (
                f"{title}\nby {author}\n\n"
                f"{'─' * 40}\n\n"
                f"Plain text could not be loaded at this time.\n\n"
                f"Read it directly at: https://www.gutenberg.org/ebooks/{gutenberg_id}"
            )

        return Response({
            "title":       title,
            "author":      author,
            "cover_url":   cover_url,
            "source":      "gutenberg",
            "description": "",
            "subjects":    subjects,
            "bookshelves": bookshelves,
            "year":        None,
            "text":        text,
        })

    def _fetch_archive(self, identifier):
        meta_r = httpx.get(f"https://archive.org/metadata/{identifier}", timeout=15)
        meta_r.raise_for_status()
        meta      = meta_r.json()
        m         = meta.get("metadata", {})
        title     = m.get("title", "Untitled")
        creator   = m.get("creator", "Unknown")
        cover_url = f"https://archive.org/services/img/{identifier}"
        desc      = m.get("description", "")
        if isinstance(desc, list):
            desc = " ".join(desc)
        subjects  = m.get("subject", [])
        if isinstance(subjects, str):
            subjects = [subjects]
        year_raw  = m.get("year") or m.get("date", "")
        year      = None
        if year_raw:
            y = re.search(r"\d{4}", str(year_raw))
            if y:
                year = int(y.group())

        files     = meta.get("files", [])
        text_file = None
        for f in files:
            name = f.get("name", "")
            if name.endswith("_djvu.txt") or name.endswith(".txt"):
                text_file = name
                break

        def _fallback_text():
            t = "Full plain-text is not freely available for this Archive.org item.\n\n"
            if desc:
                t += f"---\n\n{desc}\n\n---\n\n"
            t += "You can use this app to track your reading status or borrow the physical book from your local library."
            return t

        def _base():
            return {
                "title":       title,
                "author":      creator,
                "cover_url":   cover_url,
                "source":      "archive",
                "description": desc,
                "subjects":    subjects,
                "bookshelves": [],
                "year":        year,
            }

        if not text_file:
            stream_url = f"https://archive.org/stream/{identifier}/{identifier}_djvu.txt"
            try:
                text_r = httpx.get(stream_url, timeout=20, follow_redirects=True)
                text_r.raise_for_status()
                return Response({**_base(), "text": text_r.text[:300000]})
            except Exception:
                return Response({**_base(), "text": _fallback_text()})

        try:
            text_url = f"https://archive.org/download/{identifier}/{text_file}"
            text_r   = httpx.get(text_url, timeout=20, follow_redirects=True)
            text_r.raise_for_status()
            text = text_r.text[:300000]
        except Exception:
            text = _fallback_text()

        return Response({**_base(), "text": text})

    def _fetch_openlibrary(self, ol_id):
        work_r = httpx.get(f"https://openlibrary.org/works/{ol_id}.json", timeout=15)
        work_r.raise_for_status()
        work      = work_r.json()
        title     = work.get("title", "Untitled")
        cover_id  = work.get("covers", [None])[0]
        cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else ""

        desc = work.get("description", "")
        if isinstance(desc, dict):
            desc = desc.get("value", "")

        subjects    = work.get("subjects",    [])[:8]
        bookshelves = work.get("bookshelves", [])[:8]

        author = "Unknown"
        try:
            author_key = work.get("authors", [{}])[0].get("author", {}).get("key", "")
            if author_key:
                a_r    = httpx.get(f"https://openlibrary.org{author_key}.json", timeout=10)
                author = a_r.json().get("name", "Unknown")
        except Exception:
            pass

        ia_id = None
        year  = None
        try:
            editions_r = httpx.get(
                f"https://openlibrary.org/works/{ol_id}/editions.json?limit=10",
                timeout=15
            )
            editions_r.raise_for_status()
            for ed in editions_r.json().get("entries", []):
                if not year:
                    pd = ed.get("publish_date", "")
                    if pd:
                        y = re.search(r"\d{4}", str(pd))
                        if y:
                            year = int(y.group())
                if not ia_id:
                    ia_ids = ed.get("ocaid") or ed.get("ia") or []
                    if isinstance(ia_ids, str):
                        ia_ids = [ia_ids]
                    if ia_ids:
                        ia_id = ia_ids[0]
                if ia_id and year:
                    break
        except Exception:
            pass

        def _base():
            return {
                "title":       title,
                "author":      author,
                "cover_url":   cover_url,
                "source":      "openlibrary",
                "description": desc,
                "subjects":    subjects,
                "bookshelves": bookshelves,
                "year":        year,
            }

        if not ia_id:
            fallback = (
                "Full plain-text is not freely available for this edition on Open Library.\n\n"
                + (f"---\n\n{desc}\n\n---\n\n" if desc else "")
                + "You can use this app to track your reading status or borrow the physical book from your local library."
            )
            return Response({**_base(), "text": fallback})

        archive_resp = self._fetch_archive(ia_id)
        merged = {**archive_resp.data, **_base()}
        merged["text"] = archive_resp.data.get("text", "")
        return Response(merged)

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

        description = info.get("description", "")
        subjects    = info.get("categories", [])
        year_str    = info.get("publishedDate", "")
        year        = int(year_str[:4]) if year_str and year_str[:4].isdigit() else None

        def _base():
            return {
                "title":       title,
                "author":      author,
                "cover_url":   cover_url,
                "source":      "google",
                "description": description,
                "subjects":    subjects,
                "bookshelves": [],
                "year":        year,
            }

        download_url = (
            access.get("epub", {}).get("downloadLink") or
            access.get("pdf",  {}).get("downloadLink") or ""
        )
        if download_url:
            try:
                text_r = httpx.get(download_url, timeout=20, follow_redirects=True)
                text_r.raise_for_status()
                return Response({**_base(), "text": text_r.text[:300000]})
            except Exception:
                pass

        preview_text = (
            f"{title}\nby {author}\n\n{'─' * 40}\n\n"
            f"{description}\n\n{'─' * 40}\n\n"
            f"Full text not available (may be under copyright).\n"
            f"Visit: https://books.google.com/books?id={google_id}"
        )
        return Response({**_base(), "text": preview_text})

