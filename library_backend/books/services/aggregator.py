from concurrent.futures import ThreadPoolExecutor
from . import gutendex, google_books, openlibrary, archive


def search_all(query: str, page: int = 1, sources: list = None) -> list:
    """
    Parallel search across all verified full-text sources.
    Uses ThreadPoolExecutor to prevent sequential network bottlenecks.
    """
    all_results = []
    
    # Define search tasks
    tasks = [
        lambda: gutendex.search(query, page),
        lambda: google_books.search(query, page),
        lambda: openlibrary.search(query, page),
        lambda: archive.search(query, page)
    ]

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(t) for t in tasks]
        for f in futures:
            try:
                res = f.result()
                if res: all_results.extend(res)
            except Exception as e:
                print(f"[aggregator] source search failed: {e}")

    # Deduplicate and sort by something useful (e.g., download count or relevance)
    seen = set()
    unique_results = []
    for book in all_results:
        bid = book.get("book_id")
        if bid not in seen:
            unique_results.append(book)
            seen.add(bid)

    return unique_results[:40]


def trending_all() -> list:
    """Combined trending books (Gutenberg prioritized)."""
    return gutendex.trending()


def category_all(genre: str, page: int = 1) -> list:
    """Combined category view (Gutenberg prioritized)."""
    return gutendex.by_category(genre, page)


def fetch_all_shelves(genres_map: list) -> list:
    """
    Fetches multiple genres in parallel on the server.
    genres_map: list of {"label": "...", "genre": "...", "type": "category|trending"}
    """
    final_output = []

    def _fetch_one(item):
        label = item["label"]
        g_type = item.get("type", "category")
        genre = item.get("genre", "")
        
        try:
            if g_type == "trending":
                books = trending_all()
            else:
                books = category_all(genre)
            # return more candidates so deduplication has something to work with
            return {"label": label, "books": books[:30]} 
        except Exception:
            return {"label": label, "books": []}

    with ThreadPoolExecutor(max_workers=len(genres_map)) as executor:
        # executor.map preserves the order of the genres_map
        results = list(executor.map(_fetch_one, genres_map))
        
        seen_ids = set()
        for res in results:
            if res and res.get("books"):
                unique_books = []
                for b in res["books"]:
                    bid = b.get("book_id")
                    if bid not in seen_ids:
                        unique_books.append(b)
                        seen_ids.add(bid)
                    if len(unique_books) >= 12:
                        break
                
                # Only add the shelf if it still has books after deduplication
                if unique_books:
                    final_output.append({
                        "label": res["label"],
                        "books": unique_books
                    })

    return final_output


def new_arrivals_all() -> list:
    """Combined new arrivals (Gutenberg prioritized)."""
    return gutendex.new_arrivals()