from concurrent.futures import ThreadPoolExecutor, as_completed
from . import openlibrary, google_books, gutendex, archive


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
    # Gutendex + Archive only — both have free text available
    fn_map = {
        "gutendex": lambda: gutendex.search(query, page),
        "archive":  lambda: archive.search(query, page),
    }
    results = _run_parallel(fn_map)
    return _deduplicate(results)


def trending_all() -> list:
    try:
        return _deduplicate(gutendex.trending())
    except Exception as e:
        print(f"[aggregator] gutendex trending failed: {e}")
        return []


def category_all(genre: str, page: int = 1) -> list:
    try:
        return _deduplicate(gutendex.by_category(genre, page))
    except Exception as e:
        print(f"[aggregator] gutendex category failed: {e}")
        return []


def new_arrivals_all() -> list:
    try:
        return _deduplicate(gutendex.trending())
    except Exception as e:
        print(f"[aggregator] gutendex new_arrivals failed: {e}")
        return []