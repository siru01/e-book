from django.core.cache import cache
from django.conf import settings
import hashlib, json


def _make_key(prefix: str, **kwargs) -> str:
    raw = json.dumps(kwargs, sort_keys=True)
    hashed = hashlib.md5(raw.encode()).hexdigest()[:12]
    return f"books:{prefix}:{hashed}"


def get_cached(prefix: str, **kwargs):
    try:
        key = _make_key(prefix, **kwargs)
        return cache.get(key)
    except Exception as e:
        print(f"[cache] get failed: {e}")
        return None          # ← treat cache miss, fetch from API


def set_cached(prefix: str, value, **kwargs):
    try:
        key = _make_key(prefix, **kwargs)
        ttl = settings.CACHE_TTL.get(prefix, 60 * 30)
        cache.set(key, value, timeout=ttl)
    except Exception as e:
        print(f"[cache] set failed: {e}")  # ← log but don't crash


def invalidate(prefix: str, **kwargs):
    try:
        key = _make_key(prefix, **kwargs)
        cache.delete(key)
    except Exception as e:
        print(f"[cache] invalidate failed: {e}")