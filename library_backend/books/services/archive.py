import requests
from .cache import get_cached, set_cached

BASE_URL = "https://archive.org"


def _normalize(doc: dict) -> dict:
    identifier = doc.get("identifier", "")
    cover_url = f"https://archive.org/services/img/{identifier}" if identifier else ""
    read_url  = f"https://archive.org/details/{identifier}" if identifier else ""
    year = doc.get("year") or doc.get("date", "")
    if year and len(str(year)) > 4:
        year = str(year)[:4]
    return {
        "book_id":        f"archive:{identifier}",
        "title":          doc.get("title", ""),
        "authors":        [doc.get("creator", "")] if doc.get("creator") else [],
        "cover_url":      cover_url,
        "description":    doc.get("description", "")[:500] if doc.get("description") else "",
        "source":         "archive",
        "read_url":       read_url,
        "subjects":       doc.get("subject", []) if isinstance(doc.get("subject"), list) else [doc.get("subject", "")],
        "year":           int(year) if str(year).isdigit() else None,
        "download_count": doc.get("downloads", 0),
    }


def _search_request(params: dict):
    base_params = {
        "mediatype": "texts",
        "fl[]":      "identifier,title,creator,description,subject,year,date,downloads",
        "output":    "json",
        "rows":      20,
    }
    base_params.update(params)
    resp = requests.get(f"{BASE_URL}/advancedsearch.php", params=base_params, timeout=10)
    resp.raise_for_status()
    return resp.json().get("response", {}).get("docs", [])


def search(query: str, page: int = 1):
    cached = get_cached("search", source="archive", q=query, page=page)
    if cached:
        return cached
    start = (page - 1) * 20
    docs = _search_request({"q": f"{query} AND mediatype:texts", "start": start})
    results = [_normalize(d) for d in docs]
    set_cached("search", results, source="archive", q=query, page=page)
    return results


def trending():
    cached = get_cached("trending", source="archive")
    if cached:
        return cached
    docs = _search_request({"q": "mediatype:texts", "sort[]": "downloads desc"})
    results = [_normalize(d) for d in docs]
    set_cached("trending", results, source="archive")
    return results


def by_category(genre: str, page: int = 1):
    cached = get_cached("category", source="archive", genre=genre, page=page)
    if cached:
        return cached
    start = (page - 1) * 20
    docs = _search_request({"q": f"subject:{genre} AND mediatype:texts", "start": start})
    results = [_normalize(d) for d in docs]
    set_cached("category", results, source="archive", genre=genre, page=page)
    return results


def new_arrivals():
    cached = get_cached("new_arrivals", source="archive")
    if cached:
        return cached
    docs = _search_request({"q": "mediatype:texts", "sort[]": "addeddate desc"})
    results = [_normalize(d) for d in docs]
    set_cached("new_arrivals", results, source="archive")
    return results