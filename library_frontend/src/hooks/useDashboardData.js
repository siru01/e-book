import { useQuery } from '@tanstack/react-query';
import {
  fetchMyBooks,
  fetchMyHistory,
  fetchMyBookmarks,
  fetchShelfRows,        // ✦ RENAMED from fetchGutendexRows
} from '../api/shelf';

// ── Cache settings ──────────────────────────────────────────────
const STALE_5_MIN  = 5  * 60 * 1000;
const STALE_24_HRS = 24 * 60 * 60 * 1000;

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

// ✦ RENAMED: useGutenbergRows → useShelfRows
// Fetches the 4 dashboard shelf rows (Open Library + Google Books).
// 24h staleTime — never refetches on login if data is in cache.
export const useShelfRows = () =>
  useQuery({
    queryKey            : ['shelfRows'],   // ✦ key also updated from 'gutenbergRows'
    queryFn             : fetchShelfRows,  // ✦ uses renamed fetchShelfRows
    staleTime           : STALE_24_HRS,
    gcTime              : STALE_24_HRS,
    refetchOnWindowFocus: false,
    refetchOnReconnect  : false,
    refetchOnMount      : false,
  });