import { lazy } from 'react';

const RELOAD_PREFIX = 'kpb_lazy_reload_';

const isChunkError = (error) =>
  /(Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk .* failed)/i.test(
    error?.message || String(error)
  );

const safeGet = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const safeRemove = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

/**
 * React.lazy with resilience against stale deployed chunks.
 * 1st failure: retry the import once with a cache-busting query.
 * 2nd failure: hard reload the page once (fresh index.html -> fresh chunk map).
 */
export const lazyWithRetry = (importer, name) =>
  lazy(async () => {
    const key = `${RELOAD_PREFIX}${name}`;
    try {
      const mod = await importer();
      safeRemove(key);
      return mod;
    } catch (error) {
      if (!isChunkError(error)) throw error;

      // Second attempt: bust any stale HTTP/service-worker cache.
      try {
        const mod = await importer();
        safeRemove(key);
        return mod;
      } catch (retryError) {
        if (safeGet(key) === '1') throw retryError;
        safeSet(key, '1');
        window.location.reload();
        // Keep the promise pending while the page reloads.
        return new Promise(() => {});
      }
    }
  });

export default lazyWithRetry;
