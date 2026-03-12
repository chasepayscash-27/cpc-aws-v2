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
        const data = await loadCsv<PullManifestRow>("/data/pull_manifest_v2.csv");
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
              <th className="px-3 py-2 text-left">Project UUID</th>
              <th className="px-3 py-2 text-left">Project Name</th>
              <th className="px-3 py-2 text-left">Photo Log Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-800">
                <td className="px-3 py-2">{row.project_uuid || "-"}</td>
                <td className="px-3 py-2">{row.project_name || "-"}</td>
                <td className="px-3 py-2">{row.photo_log_status || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}