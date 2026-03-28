from concurrent.futures import ThreadPoolExecutor, as_completed
from . import gutendex, openlibrary, google_books, archive

ALL_SOURCES = {
    "openlibrary": openlibrary,
    "google":      google_books,
    "archive":     archive,
}


def _run_parallel(fn_map: dict) -> list:
    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(fn): name for name, fn in fn_map.items()}
        for future in as_completed(futures):
            source = futures[future]
            try:
                results.extend(future.result())
            except Exception as e:
                print(f"[aggregator] {source} failed: {e}")
    return results


def _deduplicate(books: list) -> list:
    seen = set()
    unique = []
    for book in books:
        title_key  = book["title"].lower().strip()[:40]
        author_key = (book["authors"][0].lower().strip()[:20] if book["authors"] else "")
        fp = f"{title_key}|{author_key}"
        if fp not in seen:
            seen.add(fp)
            unique.append(book)
    return unique


def search_all(query: str, page: int = 1, sources: list = None) -> list:
    sources = sources or list(ALL_SOURCES.keys())
    fn_map = {
        s: (lambda mod=ALL_SOURCES[s]: mod.search(query, page))
        for s in sources if s in ALL_SOURCES
    }
    return _deduplicate(_run_parallel(fn_map))


def trending_all() -> list:
    fn_map = {s: (lambda mod=m: mod.trending()) for s, m in ALL_SOURCES.items()}
    return _deduplicate(_run_parallel(fn_map))


def category_all(genre: str, page: int = 1) -> list:
    fn_map = {
        s: (lambda mod=m: mod.by_category(genre, page))
        for s, m in ALL_SOURCES.items()
    }
    return _deduplicate(_run_parallel(fn_map))


def new_arrivals_all() -> list:
    fn_map = {
        "google":      lambda: google_books.new_arrivals(),
        "openlibrary": lambda: openlibrary.new_arrivals(),
    }
    return _deduplicate(_run_parallel(fn_map))