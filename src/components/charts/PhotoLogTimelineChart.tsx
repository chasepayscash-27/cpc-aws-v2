
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { loadCsv } from "../../utils/csv";
import type { PhotoLogRow } from "../../types/photoLog";

interface TimelineRow {
  date: string;
  count: number;
}

export default function PhotoLogTimelineChart() {
  const [data, setData] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const rows = await loadCsv<PhotoLogRow>("/data/project_photo_log_v2.csv");

        const grouped = rows.reduce<Record<string, number>>((acc, row) => {
          const rawDate = row.photo_date || row.uploaded_at || "Unknown";
          const date = rawDate.toString().slice(0, 10);
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(grouped)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setData(chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load photo log");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading photo timeline...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ background: '#f5f7f5', borderRadius: '14px', padding: '16px' }}>
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: 'var(--accent)' }}>Photo Log Timeline</h2>
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted)" tick={{ fill: "var(--text)" }} />
            <YAxis stroke="var(--muted)" allowDecimals={false} tick={{ fill: "var(--text)" }} />
            <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}