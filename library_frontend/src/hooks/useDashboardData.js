import { useQuery } from '@tanstack/react-query';
import {
  fetchMyBooks,
  fetchMyHistory,
  fetchMyBookmarks,
  fetchGutendexRows,
} from '../api/shelf';

// ── Cache settings ──────────────────────────────────────────────
const STALE_5_MIN  = 5  * 60 * 1000;
const STALE_10_MIN = 10 * 60 * 1000;

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

// ── Gutenberg shelf rows (public, no token needed) ───────────────
export const useGutenbergRows = () =>
  useQuery({
    queryKey : ['gutenbergRows'],
    queryFn  : fetchGutendexRows,
    staleTime: STALE_10_MIN,   // books don't change often → cache longer
  });