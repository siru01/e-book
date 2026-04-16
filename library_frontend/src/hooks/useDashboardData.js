import { useQuery } from '@tanstack/react-query';
import {
  fetchMySummary,
  fetchShelfRows,
} from '../api/shelf';

// ── Cache settings ──────────────────────────────────────────────
const STALE_5_MIN   = 5  * 60 * 1000;
const STALE_30_DAYS = 30 * 24 * 60 * 60 * 1000;

export const useDashboardSummary = (token) =>
  useQuery({
    queryKey : ['dashboardSummary', token],
    queryFn  : () => fetchMySummary(token),
    staleTime: 0,
    gcTime: STALE_5_MIN,
    enabled  : !!token,
  });

// Fetches the 4 dashboard shelf rows (Open Library + Google Books).
export const useShelfRows = () =>
  useQuery({
    queryKey            : ['shelfRows'],
    queryFn             : fetchShelfRows,
    staleTime           : STALE_30_DAYS,
    gcTime              : STALE_30_DAYS,
    refetchOnWindowFocus: false,
    refetchOnReconnect  : false,
    refetchOnMount      : false,
  });