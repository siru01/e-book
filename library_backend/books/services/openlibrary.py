import requests
from .cache import get_cached, set_cached

BASE_URL = "https://openlibrary.org"
COVERS_URL = "https://covers.openlibrary.org/b/id"


def _normalize(doc: dict) -> dict:
    cover_id = doc.get("cover_i")
    cover_url = f"{COVERS_URL}/{cover_id}-L.jpg" if cover_id else ""
    ol_key  = doc.get("key", "")
    book_id = ol_key.replace("/works/", "")

    # ── Point to Internet Archive full text if available ─────
    ia_list  = doc.get("ia", [])
    ia_id    = ia_list[0] if ia_list else None
    read_url = f"https://archive.org/stream/{ia_id}" if ia_id else f"{BASE_URL}{ol_key}"

    return {
        "book_id":        f"openlibrary:{book_id}",
        "title":          doc.get("title", ""),
        "authors":        doc.get("author_name", []),
        "cover_url":      cover_url,
        "description":    doc.get("first_sentence", {}).get("value", "") if isinstance(doc.get("first_sentence"), dict) else "",
        "source":         "openlibrary",
        "read_url":       read_url,
        "subjects":       doc.get("subject", [])[:5],
        "year":           doc.get("first_publish_year"),
        "download_count": 0,
    }


def search(query: str, page: int = 1):
    cached = get_cached("search", source="openlibrary", q=query, page=page)
    if cached:
        return cached
    
    # ── Strict API filtering for English & Full Text ──
    full_query = f"{query} AND language:eng AND has_fulltext:true"

    resp = requests.get(
        f"{BASE_URL}/search.json",
        params={
            "q": full_query, "page": page, "limit": 20,
            "fields": "key,title,author_name,cover_i,subject,first_publish_year,first_sentence,ia"
        },
        timeout=15
    )
    resp.raise_for_status()
    results = [_normalize(d) for d in resp.json().get("docs", [])]
    set_cached("search", results, source="openlibrary", q=query, page=page)
    return results


def trending():
    cached = get_cached("trending", source="openlibrary")
    if cached:
        return cached
    resp = requests.get(f"{BASE_URL}/trending/daily.json", timeout=8)
    resp.raise_for_status()
    results = [_normalize(w) for w in resp.json().get("works", [])]
    set_cached("trending", results, source="openlibrary")
    return results


def by_category(genre: str, page: int = 1):
    cached = get_cached("category", source="openlibrary", genre=genre, page=page)
    if cached:
        return cached

    resp = requests.get(
        f"{BASE_URL}/subjects/{genre.lower().replace(' ', '_')}.json",
        params={"limit": 20, "offset": (page - 1) * 20},
        timeout=15
    )
    resp.raise_for_status()
    works = resp.json().get("works", [])

    # ── Guard: skip any item that isn't a dict ────────────────
    works = [w for w in works if isinstance(w, dict)]

    results = []
    for w in works:
        cover_id = w.get("cover_id")
        ol_key   = w.get("key", "")
        ia_list  = w.get("ia", [])
        ia_id    = ia_list[0] if ia_list else None
        read_url = f"https://archive.org/stream/{ia_id}" if ia_id else f"{BASE_URL}{ol_key}"

        results.append({
            "book_id":        f"openlibrary:{ol_key.replace('/works/', '')}",
            "title":          w.get("title", ""),
            "authors":        [a.get("name", "") for a in w.get("authors", []) if isinstance(a, dict)],
            "cover_url":      f"{COVERS_URL}/{cover_id}-M.jpg" if cover_id else "",
            "description":    "",
            "source":         "openlibrary",
            "read_url":       read_url,
            "subjects":       [s.get("name", "") for s in w.get("subject", [])[:5] if isinstance(s, dict)],
            "year":           w.get("first_publish_year"),
            "download_count": 0,
        })

    set_cached("category", results, source="openlibrary", genre=genre, page=page)
    return results

def new_arrivals():
    cached = get_cached("new_arrivals", source="openlibrary")
    if cached:
        return cached
    resp = requests.get(
        f"{BASE_URL}/search.json",
        params={
            "q": "new books",
            "sort": "new",
            "limit": 20,
            "fields": "key,title,author_name,cover_i,subject,first_publish_year,first_sentence,ia"
        },
        timeout=15
    )
    resp.raise_for_status()
    results = [_normalize(d) for d in resp.json().get("docs", [])]
    set_cached("new_arrivals", results, source="openlibrary")
    return results