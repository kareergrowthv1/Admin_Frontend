/**
 * GET request deduplication + short-term response cache.
 * - Same GET (url + params) in flight: returns the same promise (one API call).
 * - Same GET within TTL after completion: returns cached response (no API call when revisiting page).
 */

// Axios config.adapter can be undefined or an array of names; we need a real function for the browser.
import xhrAdapterModule from 'axios/lib/adapters/xhr.js';
const xhrAdapter = typeof xhrAdapterModule === 'function' ? xhrAdapterModule : null;

const CACHE_TTL_MS = 60 * 1000; // 1 minute
const cache = new Map();
const inFlight = new Map();

function getCacheKey(config) {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params != null ? config.params : {};
  const serialized = typeof params === 'object' ? JSON.stringify(params) : String(params);
  return `${method}:${url}:${serialized}`;
}

function isStale(entry) {
  return Date.now() - entry.timestamp > 60000;
}

/**
 * Install cache/dedup on an axios instance (GET only).
 * Same GET (url+params) runs once; response cached for CACHE_TTL_MS so revisiting page doesn't refetch.
 * @param {import('axios').AxiosInstance} axiosInstance
 * @param {((config: import('axios').InternalAxiosRequestConfig) => Promise<import('axios').AxiosResponse>) | undefined} [fallbackAdapter] - optional; otherwise uses xhr adapter (browser)
 */
export function installGetCache(axiosInstance, fallbackAdapter) {
  const runAdapter = typeof fallbackAdapter === 'function' ? fallbackAdapter : xhrAdapter;
  if (typeof runAdapter !== 'function') return;

  axiosInstance.interceptors.request.use((config) => {
    if ((config.method || 'get').toLowerCase() !== 'get') return config;
    if (config.skipCache === true) return config;

    const key = getCacheKey(config);

    const cached = cache.get(key);
    if (cached && !isStale(cached)) {
      config.adapter = () => Promise.resolve(cached.response);
      return config;
    }

    if (inFlight.has(key)) {
      config.adapter = () => inFlight.get(key);
      return config;
    }

    const promise = runAdapter(config)
      .then((response) => {
        cache.set(key, { response, ts: Date.now() });
        inFlight.delete(key);
        return response;
      })
      .catch((err) => {
        inFlight.delete(key);
        throw err;
      });

    inFlight.set(key, promise);
    config.adapter = () => promise;
    return config;
  });
}

/** Clear cache (e.g. after logout or when user explicitly refreshes). */
export function clearApiCache() {
  cache.clear();
  inFlight.clear();
}
