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
    <div style={{ background: '#f5f7f5', borderRadius: '14px', padding: '16px' }}>
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: '#1a7a3c' }}>Pull Manifest</h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#1a2e1a' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #d4e8d8' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#1a7a3c', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em' }}>Source</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#1a7a3c', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em' }}>File</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#1a7a3c', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em' }}>Pull Date</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#1a7a3c', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em' }}>Loaded At</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#1a7a3c', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em' }}>Record Count</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#1a7a3c', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eaf4ec' }}>
                <td style={{ padding: '8px 12px' }}>{row.source_name || "-"}</td>
                <td style={{ padding: '8px 12px' }}>{row.file_name || "-"}</td>
                <td style={{ padding: '8px 12px' }}>{row.pull_date || "-"}</td>
                <td style={{ padding: '8px 12px' }}>{row.loaded_at || "-"}</td>
                <td style={{ padding: '8px 12px' }}>{row.record_count || "-"}</td>
                <td style={{ padding: '8px 12px' }}>{row.status || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
