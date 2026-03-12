import Papa from "papaparse";

export async function loadCsv<T>(path: string): Promise<T[]> {
  const res = await fetch(path);

  if (!res.ok) {
    throw new Error(`Failed to load CSV: ${path}`);
  }

  const text = await res.text();

  return new Promise((resolve, reject) => {
    Papa.parse<T>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error: Error) => reject(error),
    });
  });
}