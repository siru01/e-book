import { useQuery } from '@tanstack/react-query';
import {
  fetchMyBooks,
  fetchMyHistory,
  fetchMyBookmarks,
  fetchGutendexRows,
} from '../api/shelf';

// ── Cache settings ──────────────────────────────────────────────
const STALE_5_MIN  = 5  * 60 * 1000;
const STALE_24_HRS = 24 * 60 * 60 * 1000;   // shelf rows — only 4 genres, cache all day

// ── My Books (recent readings + calendar) ───────────────────────
export const useMyBooks = (token) =>
  useQuery({
    queryKey : ['myBooks', token],
    queryFn  : () => fetchMyBooks(token),
    staleTime: STALE_5_MIN,
    enabled  : !!token,
  });

// ── My History (history + previously read) ──────────────────────
export const useMyHistory = (token) =>
  useQuery({
    queryKey : ['myHistory', token],
    queryFn  : () => fetchMyHistory(token),
    staleTime: STALE_5_MIN,
    enabled  : !!token,
  });

// ── My Bookmarks ─────────────────────────────────────────────────
export const useMyBookmarks = (token) =>
  useQuery({
    queryKey : ['myBookmarks', token],
    queryFn  : () => fetchMyBookmarks(token),
    staleTime: STALE_5_MIN,
    enabled  : !!token,
  });

// ── Shelf rows (public, no token needed) ─────────────────────────
// Only 4 genres: Trending, New Arrivals, Science Fiction, Mystery.
// staleTime = 24h — React Query won't refetch on every login.
// Backend Redis also caches each endpoint for 24h, so the actual
// Open Library / Google Books API is only hit once per day.
export const useGutenbergRows = () =>
  useQuery({
    queryKey       : ['gutenbergRows'],
    queryFn        : fetchGutendexRows,
    staleTime      : STALE_24_HRS,
    gcTime         : STALE_24_HRS,   // keep in memory for 24h (formerly cacheTime)
    refetchOnWindowFocus    : false,  // don't refetch when user switches tabs
    refetchOnReconnect      : false,  // don't refetch on network reconnect
    refetchOnMount          : false,  // don't refetch if data already in cache
  });