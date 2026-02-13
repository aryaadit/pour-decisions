import { QueryClient } from "@tanstack/react-query";

// Keys to persist in localStorage
const CACHE_KEY = "BARKEEPLY_QUERY_CACHE";
const CACHE_VERSION = "v1";

// ISO 8601 date pattern for JSON reviver
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * JSON reviver that converts ISO date strings back to Date objects.
 * Needed because JSON.stringify turns Date objects into strings,
 * and our domain types (Drink, Profile, etc.) expect real Date instances.
 */
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

// Create query client with offline-first configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes when online
      staleTime: 1000 * 60 * 5,
      // Cache data for 24 hours (for offline use)
      gcTime: 1000 * 60 * 60 * 24,
      // Retry failed requests 3 times
      retry: 3,
      // Don't refetch on window focus when offline
      refetchOnWindowFocus: () => navigator.onLine,
      // Use cached data when offline
      networkMode: "offlineFirst",
    },
    mutations: {
      // Keep mutations in cache for retry when back online
      networkMode: "offlineFirst",
    },
  },
});

// Simple cache persistence utilities
export function saveQueryCache() {
  try {
    const cache = queryClient.getQueryCache().getAll();
    const serializable = cache
      .filter((query) => query.state.data !== undefined)
      .map((query) => ({
        queryKey: query.queryKey,
        data: query.state.data,
        dataUpdatedAt: query.state.dataUpdatedAt,
      }));

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        version: CACHE_VERSION,
        timestamp: Date.now(),
        queries: serializable,
      })
    );
  } catch (e) {
    console.warn("Failed to save query cache:", e);
  }
}

export function restoreQueryCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;

    const { version, timestamp, queries } = JSON.parse(cached, dateReviver);

    // Check version and age (24 hours max)
    if (version !== CACHE_VERSION) return;
    if (Date.now() - timestamp > 1000 * 60 * 60 * 24) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    // Restore cached queries
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

    console.log(`Restored ${queries.length} cached queries`);
  } catch (e) {
    console.warn("Failed to restore query cache:", e);
  }
}

// Auto-save cache periodically and on visibility change
let saveTimeout: NodeJS.Timeout | null = null;

export function setupCachePersistence() {
  // Restore cache on startup
  restoreQueryCache();

  // Save cache when page is hidden (user switches apps)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveQueryCache();
    }
  });

  // Save cache before unload
  window.addEventListener("beforeunload", () => {
    saveQueryCache();
  });

  // Debounced save on cache updates
  queryClient.getQueryCache().subscribe(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveQueryCache, 5000);
  });
}
