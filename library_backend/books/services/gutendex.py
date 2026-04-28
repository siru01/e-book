import httpx
from .cache import get_cached, set_cached

BASE_URL = "https://gutendex.com"


def _normalize(book: dict) -> dict:
    gid     = book.get("id", "")
    formats = book.get("formats", {})
    cover_url = formats.get("image/jpeg", "")
    if not cover_url:
        return None # MUST HAVE COVER
    
    authors   = [a.get("name", "") for a in book.get("authors", [])]
    text_url = (
        formats.get("text/plain; charset=utf-8") or
        formats.get("text/plain; charset=us-ascii") or
        formats.get("text/plain") or
        ""
    )
    if not text_url:
        return None  # Filter out books without full text!

    return {
        "book_id":        f"gutenberg:{gid}",
        "title":          book.get("title", ""),
        "authors":        authors,
        "cover_url":      cover_url,
        "description":    "",
        "source":         "gutenberg",
        "read_url":       text_url,
        "subjects":       book.get("subjects",    [])[:5],
        "bookshelves":    book.get("bookshelves", [])[:5],
        "year":           None,
        "download_count": book.get("download_count", 0),
    }


def search(query: str, page: int = 1):
    cached = get_cached("search", source="gutenberg", q=query, page=page)
    if cached:
        return cached

    for attempt in range(2):
        try:
            # Optimized API hit with direct filtering
            # mime_type=text/plain asks Gutendex for Full Text only
            with httpx.Client(timeout=30, follow_redirects=True) as client:
                resp = client.get(
                    f"{BASE_URL}/books", 
                    params={"search": query, "page": page, "languages": "en", "mime_type": "text/plain"}
                )
            
            if resp.status_code == 429 and attempt == 0:
                import time
                time.sleep(1)
                continue

            resp.raise_for_status()
            data = resp.json()
            raw_results = data.get("results", [])
            
            # Normalize and filter for Full Text ONLY
            results = []
            for b in raw_results:
                n = _normalize(b)
                if n: results.append(n)
                
            set_cached("search", results, source="gutenberg", q=query, page=page)
            return results
        except Exception as e:
            if attempt == 1:
                print(f"[gutendex] search failed for query '{query}' after retry: {e}")
                return []
            import time
            time.sleep(0.5)
    return []


def trending():
    cached = get_cached("trending", source="gutenberg")
    if cached:
        return cached
    for attempt in range(2):
        try:
            with httpx.Client(timeout=30, follow_redirects=True) as client:
                resp = client.get(f"{BASE_URL}/books", params={"sort": "popular", "page": 1})
            
            if resp.status_code == 429 and attempt == 0:
                import time
                time.sleep(1)
                continue

            resp.raise_for_status()
            raw_books = resp.json().get("results", [])
            
            # Use simple normalize, no DB
            results = []
            for b in raw_books:
                n = _normalize(b)
                if n: results.append(n)
                
            set_cached("trending", results, source="gutenberg")
            return results
        except Exception as e:
            if attempt == 1:
                print(f"[gutendex] trending failed after retry: {e}")
                return []
            import time
            time.sleep(0.5)
    return []


def by_category(genre: str, page: int = 1):
    cached = get_cached("category", source="gutenberg", genre=genre, page=page)
    if cached:
        return cached

    for attempt in range(2):
        try:
            with httpx.Client(timeout=30, follow_redirects=True) as client:
                resp = client.get(f"{BASE_URL}/books", params={"topic": genre, "page": page})
            
            if resp.status_code == 429 and attempt == 0:
                import time
                time.sleep(1) # Back off for 1s
                continue

            resp.raise_for_status()
            raw_books = resp.json().get("results", [])
            
            # Use simple normalize, no DB
            results = []
            for b in raw_books:
                n = _normalize(b)
                if n: results.append(n)
                
            set_cached("category", results, source="gutenberg", genre=genre, page=page)
            return results
        except Exception as e:
            if attempt == 1:
                print(f"[gutendex] by_category failed for genre '{genre}' after retry: {e}")
                return []
            import time
            time.sleep(0.5)
    return []


def new_arrivals():
    return trending()