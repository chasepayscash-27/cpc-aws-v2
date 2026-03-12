import { useEffect, useState } from "react";
import { loadCsv } from "../../utils/csv";
import type { PullManifestRow } from "../../types/manifest";

export default function PullManifestTable() {
  const [rows, setRows] = useState<PullManifestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await loadCsv<PullManifestRow>("/data/pull_manifest.csv");
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load manifest");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading pull manifest...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="rounded-2xl bg-slate-900 p-4 shadow-lg">
      <h2 className="mb-4 text-xl font-semibold text-white">Pull Manifest</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm text-white">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">File</th>
              <th className="px-3 py-2 text-left">Pull Date</th>
              <th className="px-3 py-2 text-left">Loaded At</th>
              <th className="px-3 py-2 text-left">Record Count</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-800">
                <td className="px-3 py-2">{row.source_name || "-"}</td>
                <td className="px-3 py-2">{row.file_name || "-"}</td>
                <td className="px-3 py-2">{row.pull_date || "-"}</td>
                <td className="px-3 py-2">{row.loaded_at || "-"}</td>
                <td className="px-3 py-2">{row.record_count || "-"}</td>
                <td className="px-3 py-2">{row.status || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}