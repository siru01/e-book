import requests
from .cache import get_cached, set_cached

BASE_URL = "https://gutendex.com"


def _normalize(book: dict) -> dict:
    authors = [a.get("name", "") for a in book.get("authors", [])]
    covers = book.get("formats", {})
    cover_url = covers.get("image/jpeg", "")
    read_url = covers.get("text/html", covers.get("text/plain", ""))
    return {
        "book_id":        f"gutenberg:{book['id']}",
        "title":          book.get("title", ""),
        "authors":        authors,
        "cover_url":      cover_url,
        "description":    "",
        "source":         "gutenberg",
        "read_url":       read_url,
        "subjects":       book.get("subjects", []),
        "year":           None,
        "download_count": book.get("download_count", 0),
    }


def search(query: str, page: int = 1):
    cached = get_cached("search", source="gutenberg", q=query, page=page)
    if cached:
        return cached
    resp = requests.get(f"{BASE_URL}/books/", params={"search": query, "page": page}, timeout=8)
    resp.raise_for_status()
    results = [_normalize(b) for b in resp.json().get("results", [])]
    set_cached("search", results, source="gutenberg", q=query, page=page)
    return results


def trending(page: int = 1):
    cached = get_cached("trending", source="gutenberg", page=page)
    if cached:
        return cached
    resp = requests.get(f"{BASE_URL}/books/", params={"sort": "popular", "page": page}, timeout=8)
    resp.raise_for_status()
    results = [_normalize(b) for b in resp.json().get("results", [])]
    set_cached("trending", results, source="gutenberg", page=page)
    return results


def by_category(genre: str, page: int = 1):
    cached = get_cached("category", source="gutenberg", genre=genre, page=page)
    if cached:
        return cached
    resp = requests.get(f"{BASE_URL}/books/", params={"topic": genre, "page": page}, timeout=8)
    resp.raise_for_status()
    results = [_normalize(b) for b in resp.json().get("results", [])]
    set_cached("category", results, source="gutenberg", genre=genre, page=page)
    return results