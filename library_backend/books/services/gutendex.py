import requests
from .cache import get_cached, set_cached

BASE_URL = "https://gutendex.com"


def _normalize(book: dict) -> dict:
    gid       = book.get("id", "")
    formats   = book.get("formats", {})

    # Cover image
    cover_url = formats.get("image/jpeg", "")

    # Authors
    authors = [a.get("name", "") for a in book.get("authors", [])]

    # Subjects / bookshelves
    subjects    = book.get("subjects",    [])[:5]
    bookshelves = book.get("bookshelves", [])[:5]

    return {
        "book_id":        f"gutenberg:{gid}",
        "title":          book.get("title", ""),
        "authors":        authors,
        "cover_url":      cover_url,
        "description":    "",          # Gutendex has no description field
        "source":         "gutenberg",
        "read_url":       f"https://www.gutenberg.org/ebooks/{gid}",
        "subjects":       subjects,
        "bookshelves":    bookshelves,
        "year":           None,        # not provided by Gutendex
        "download_count": book.get("download_count", 0),
    }


def search(query: str, page: int = 1):
    cached = get_cached("search", source="gutenberg", q=query, page=page)
    if cached:
        return cached
    resp = requests.get(
        f"{BASE_URL}/books",
        params={"search": query, "page": page},
        timeout=15
    )
    resp.raise_for_status()
    results = [_normalize(b) for b in resp.json().get("results", [])]
    set_cached("search", results, source="gutenberg", q=query, page=page)
    return results


def trending():
    cached = get_cached("trending", source="gutenberg")
    if cached:
        return cached
    resp = requests.get(
        f"{BASE_URL}/books",
        params={"sort": "popular", "page": 1},
        timeout=15
    )
    resp.raise_for_status()
    results = [_normalize(b) for b in resp.json().get("results", [])]
    set_cached("trending", results, source="gutenberg")
    return results


def by_category(genre: str, page: int = 1):
    cached = get_cached("category", source="gutenberg", genre=genre, page=page)
    if cached:
        return cached
    resp = requests.get(
        f"{BASE_URL}/books",
        params={"topic": genre, "page": page},
        timeout=15
    )
    resp.raise_for_status()
    results = [_normalize(b) for b in resp.json().get("results", [])]
    set_cached("category", results, source="gutenberg", genre=genre, page=page)
    return results


def new_arrivals():
    # Gutendex doesn't have a date sort, so return popular as fallback
    return trending()