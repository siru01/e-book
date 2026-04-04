import requests
from django.conf import settings
from .cache import get_cached, set_cached

BASE_URL = "https://www.googleapis.com/books/v1"


def _normalize(item: dict) -> dict:
    info    = item.get("volumeInfo", {})
    access  = item.get("accessInfo", {})
    images  = info.get("imageLinks", {})
    cover_url = images.get("thumbnail", images.get("smallThumbnail", ""))
    cover_url = cover_url.replace("http://", "https://")

    # ── Get best available read URL ──────────────────────────
    epub_url = access.get("epub", {}).get("downloadLink", "")
    pdf_url  = access.get("pdf",  {}).get("downloadLink", "")
    preview  = info.get("previewLink", "")
    read_url = epub_url or pdf_url or preview or ""

    description = info.get("description", "")
    if len(description) > 500:
        description = description[:497] + "..."

    return {
        "book_id":        f"google:{item['id']}",
        "title":          info.get("title", ""),
        "authors":        info.get("authors", []),
        "cover_url":      cover_url,
        "description":    description,
        "source":         "google",
        "read_url":       read_url,
        "subjects":       info.get("categories", []),
        "year":           info.get("publishedDate", "")[:4] if info.get("publishedDate") else None,
        "download_count": 0,
    }


def _get_params(extra: dict = None) -> dict:
    params = {"maxResults": 20}
    api_key = getattr(settings, "GOOGLE_BOOKS_API_KEY", None)
    if api_key:
        params["key"] = api_key
    if extra:
        params.update(extra)
    return params


def search(query: str, page: int = 1):
    cached = get_cached("search", source="google", q=query, page=page)
    if cached:
        return cached

    start = (page - 1) * 20
    resp = requests.get(
        f"{BASE_URL}/volumes",
        params=_get_params({
            "q": query, 
            "startIndex": start, 
            "filter": "free-ebooks",
            "langRestrict": "en"
        }),
        timeout=8
    )
    resp.raise_for_status()
    results = [_normalize(i) for i in resp.json().get("items", [])]
    set_cached("search", results, source="google", q=query, page=page)
    return results


def trending():
    cached = get_cached("trending", source="google")
    if cached:
        return cached
    resp = requests.get(
        f"{BASE_URL}/volumes",
        params=_get_params({"q": "subject:fiction", "orderBy": "relevance"}),
        timeout=8
    )
    resp.raise_for_status()
    results = [_normalize(i) for i in resp.json().get("items", [])]
    set_cached("trending", results, source="google")
    return results


def by_category(genre: str, page: int = 1):
    cached = get_cached("category", source="google", genre=genre, page=page)
    if cached:
        return cached
    start = (page - 1) * 20
    resp = requests.get(
        f"{BASE_URL}/volumes",
        params=_get_params({"q": f"subject:{genre}", "startIndex": start, "orderBy": "relevance"}),
        timeout=8
    )
    resp.raise_for_status()
    results = [_normalize(i) for i in resp.json().get("items", [])]
    set_cached("category", results, source="google", genre=genre, page=page)
    return results


def new_arrivals():
    cached = get_cached("new_arrivals", source="google")
    if cached:
        return cached
    resp = requests.get(
        f"{BASE_URL}/volumes",
        params=_get_params({"q": "new books 2025", "orderBy": "newest"}),
        timeout=8
    )
    resp.raise_for_status()
    results = [_normalize(i) for i in resp.json().get("items", [])]
    set_cached("new_arrivals", results, source="google")
    return results