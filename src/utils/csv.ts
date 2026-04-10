import Papa from "papaparse";

// Module-level cache: maps CSV path → in-flight or resolved promise.
// Subsequent calls for the same path return the cached promise instead of
// re-fetching and re-parsing (avoids the repeated 1.3 MB download for the
// photo-log CSV every time a project modal is opened).
const csvCache = new Map<string, Promise<unknown>>();

export async function loadCsv<T>(path: string): Promise<T[]> {
  if (csvCache.has(path)) {
    return csvCache.get(path) as Promise<T[]>;
  }

  const promise: Promise<T[]> = fetch(path)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load CSV: ${path}`);
      }
      return res.text();
    })
    .then(
      (text) =>
        new Promise<T[]>((resolve, reject) => {
          Papa.parse<T>(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error: Error) => reject(error),
          });
        })
    )
    .catch((err) => {
      // Remove failed entries so the caller can retry on next mount.
      csvCache.delete(path);
      throw err;
    });

  csvCache.set(path, promise);
  return promise;
}