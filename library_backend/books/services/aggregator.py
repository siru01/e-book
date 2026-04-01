from concurrent.futures import ThreadPoolExecutor, as_completed
from . import openlibrary, google_books, gutendex, archive


def _run_ordered(fn_list: list) -> list:
    """Run fns in parallel but merge results in the given order."""
    results_by_index = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(fn): i for i, fn in enumerate(fn_list)}
        for future in as_completed(futures):
            i = futures[future]
            try:
                results_by_index[i] = future.result()
            except Exception as e:
                print(f"[aggregator] source[{i}] failed: {e}")
                results_by_index[i] = []
    results = []
    for i in range(len(fn_list)):
        results.extend(results_by_index.get(i, []))
    return results


def _deduplicate(books: list) -> list:
    seen   = set()
    unique = []
    for book in books:
        title_key  = book.get("title",   "").lower().strip()[:40]
        authors    = book.get("authors", [])
        author_key = authors[0].lower().strip()[:20] if authors else ""
        fp = f"{title_key}|{author_key}"
        if fp not in seen:
            seen.add(fp)
            unique.append(book)
    return unique


def search_all(query: str, page: int = 1, sources: list = None) -> list:
    # Order: gutendex → archive → openlibrary → google_books
    results = _run_ordered([
        lambda: gutendex.search(query, page),
        lambda: archive.search(query, page),
        lambda: openlibrary.search(query, page),
        #lambda: google_books.search(query, page),
    ])
    return _deduplicate(results)


def trending_all() -> list:
    # Order: gutendex → archive → openlibrary → google_books
    results = _run_ordered([
        lambda: gutendex.trending(),
        lambda: archive.search("popular books", 1),
        lambda: openlibrary.search("bestseller", 1),
        #lambda: google_books.search("bestseller", 1),
    ])
    return _deduplicate(results)


def new_arrivals_all() -> list:
    # Order: gutendex → openlibrary → google_books
    results = _run_ordered([
        lambda: gutendex.trending(),
        lambda: openlibrary.search("new releases 2024", 1),
        #lambda: google_books.search("new releases 2024", 1),
    ])
    return _deduplicate(results)


def category_all(genre: str, page: int = 1) -> list:
    # Order: gutendex → openlibrary → google_books
    results = _run_ordered([
        lambda: gutendex.by_category(genre, page),
        lambda: openlibrary.search(genre, page),
        lambda: google_books.search(genre, page),
    ])
    return _deduplicate(results)