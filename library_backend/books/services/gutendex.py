import httpx
from .cache import get_cached, set_cached

BASE_URL = "https://gutendex.com"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
}


def _normalize(book: dict) -> dict:
    gid     = book.get("id", "")
    formats = book.get("formats", {})
    cover_url = formats.get("image/jpeg", "")
    if not cover_url:
        cover_url = f"https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.cover.medium.jpg"
    
    raw_authors = [a.get("name", "") for a in book.get("authors", [])]
    authors = []
    for a in raw_authors:
        if a and "," in a and not a.startswith("Various"):
            p = a.split(",", 1)
            authors.append(f"{p[1].strip()} {p[0].strip()}")
        elif a:
            authors.append(a)

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
            with httpx.Client(timeout=45, headers=DEFAULT_HEADERS, follow_redirects=True) as client:
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
            with httpx.Client(timeout=30, headers=DEFAULT_HEADERS, follow_redirects=True) as client:
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

    # Try both `topic` and `search` as fallback since topic can be slow/unreliable
    strategies = [
        {"topic": genre, "page": page},
        {"search": genre, "page": page, "mime_type": "text/plain"},
    ]

    for attempt, params in enumerate(strategies):
        try:
            with httpx.Client(timeout=60, headers=DEFAULT_HEADERS, follow_redirects=True) as client:
                resp = client.get(f"{BASE_URL}/books", params=params)


            if resp.status_code == 429:
                import time
                time.sleep(1)
                continue

            resp.raise_for_status()

            # Guard against empty responses (Gutendex can return 200 with no body)
            if not resp.content or not resp.text.strip():
                print(f"[gutendex] by_category empty response for genre '{genre}', trying fallback")
                continue

            raw_books = resp.json().get("results", [])

            results = []
            for b in raw_books:
                n = _normalize(b)
                if n:
                    results.append(n)

            if results:
                set_cached("category", results, source="gutenberg", genre=genre, page=page)
                return results

            # Got a valid response but no usable books — try the fallback strategy
            print(f"[gutendex] by_category got 0 usable books for '{genre}' with params {params}, trying fallback")

        except Exception as e:
            print(f"[gutendex] by_category attempt {attempt+1} failed for genre '{genre}': {e}")
            import time
            time.sleep(0.5)

    print(f"[gutendex] by_category: all strategies exhausted for '{genre}'")
    return []


def new_arrivals():
    return trending()