import { QueryClient } from "@tanstack/react-query";
import { get, set, del } from "idb-keyval";

const CACHE_KEY = "POUR_DECISIONS_QUERY_CACHE";
const CACHE_VERSION = "v2";
const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

// ISO 8601 date pattern for JSON reviver
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * JSON reviver that converts ISO date strings back to Date objects.
 * Needed because structured clone in IDB preserves Dates, but our
 * manual JSON step (for size / compat) turns them into strings.
 */
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

/**
 * Query key prefixes that should be persisted to disk.
 * These are personal, read-heavy data that the user should see offline.
 */
const PERSISTABLE_PREFIXES = [
  "drinks",
  "collections",
  "profile",
  "profileStats",
  "customDrinkTypes",
];

function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const prefix = queryKey[0];
  return typeof prefix === "string" && PERSISTABLE_PREFIXES.includes(prefix);
}

// Create query client with offline-first configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: TWENTY_FOUR_HOURS,
      retry: 3,
      refetchOnWindowFocus: () => navigator.onLine,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

// ── User-scoped cache ──────────────────────────────────────────────────────

let _cacheUserId: string | null = null;

export function setCacheUserId(userId: string | null) {
  _cacheUserId = userId;
}

export async function clearQueryCache() {
  queryClient.clear();
  try {
    await del(CACHE_KEY);
  } catch {
    // IndexedDB may be unavailable
  }
}

// ── Persist / Restore ──────────────────────────────────────────────────────

export async function saveQueryCache() {
  if (!_cacheUserId) return;

  try {
    const cache = queryClient.getQueryCache().getAll();
    const serializable = cache
      .filter(
        (query) =>
          query.state.data !== undefined && shouldPersistQuery(query.queryKey)
      )
      .map((query) => ({
        queryKey: query.queryKey,
        data: query.state.data,
        dataUpdatedAt: query.state.dataUpdatedAt,
      }));

    await set(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      userId: _cacheUserId,
      timestamp: Date.now(),
      queries: serializable,
    }));
  } catch (e) {
    console.warn("Failed to save query cache:", e);
  }
}

export async function restoreQueryCache(userId: string) {
  try {
    const raw = await get<string>(CACHE_KEY);
    if (!raw) return;

    const { version, userId: cachedUserId, timestamp, queries } = JSON.parse(
      raw,
      dateReviver
    );

    if (version !== CACHE_VERSION) return;
    if (Date.now() - timestamp > TWENTY_FOUR_HOURS) {
      await del(CACHE_KEY);
      return;
    }

    if (cachedUserId && cachedUserId !== userId) {
      await del(CACHE_KEY);
      return;
    }

    queries.forEach(
      ({
        queryKey,
        data,
        dataUpdatedAt,
      }: {
        queryKey: string[];
        data: unknown;
        dataUpdatedAt: number;
      }) => {
        queryClient.setQueryData(queryKey, data, {
          updatedAt: dataUpdatedAt,
        });
      }
    );
  } catch (e) {
    console.warn("Failed to restore query cache:", e);
  }
}

// ── Auto-save on visibility change, unload, and cache updates ──────────────

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function setupCachePersistence() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveQueryCache();
    }
  });

  window.addEventListener("beforeunload", () => {
    saveQueryCache();
  });

  queryClient.getQueryCache().subscribe(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveQueryCache, 5000);
  });
}
