from concurrent.futures import ThreadPoolExecutor, as_completed
from . import gutendex, google_books, openlibrary, archive


def search_all_stream(query: str, page: int = 1):
    """
    Parallel search that YIELDS results as soon as each source is ready.
    This allows the frontend to show books piece-by-piece.
    """
    tasks = {
        "Gutenberg":      lambda: gutendex.search(query, page),
        "Google Books":   lambda: google_books.search(query, page),
        "Open Library":   lambda: openlibrary.search(query, page),
        "Archive.org":    lambda: archive.search(query, page)
    }

    seen = set()

    with ThreadPoolExecutor(max_workers=4) as executor:
        # Submit all tasks
        future_to_source = {executor.submit(func): name for name, func in tasks.items()}
        
        # ── PRIORITY: Yield Gutenberg first if it's available ────────
        guten_future = next((f for f, name in future_to_source.items() if name == "Gutenberg"), None)
        if guten_future:
            try:
                results = guten_future.result(timeout=10) # Wait for it specifically
                if results:
                    unique_batch = []
                    for b in results:
                        bid = b.get("book_id")
                        if bid and bid not in seen:
                            unique_batch.append(b)
                            seen.add(bid)
                    if unique_batch:
                        yield {"source": "Gutenberg", "books": unique_batch}
            except Exception as e:
                print(f"[aggregator] Gutenberg priority wait failed: {e}")

        # ── Then yield everything else as they complete ──────────────
        for future in as_completed(future_to_source):
            source_name = future_to_source[future]
            if source_name == "Gutenberg":
                continue # Already handled above
                
            try:
                results = future.result()
                if not results:
                    continue
                
                # Deduplicate on the fly
                unique_batch = []
                for b in results:
                    bid = b.get("book_id")
                    if bid and bid not in seen:
                        unique_batch.append(b)
                        seen.add(bid)
                
                if unique_batch:
                    yield {
                        "source": source_name,
                        "books": unique_batch
                    }
                    
            except Exception as e:
                print(f"[aggregator] {source_name} search failed: {e}")


def search_all(query: str, page: int = 1, sources: list = None) -> list:
    """
    Sequential-looking but actually runs search_all_stream 
    and flattens for legacy non-streaming endpoints.
    """
    combined = []
    for chunk in search_all_stream(query, page):
        combined.extend(chunk["books"])
    return combined[:40]


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