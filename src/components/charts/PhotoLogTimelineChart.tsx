
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
        const rows = await loadCsv<PhotoLogRow>("/data/project_photo_log.csv");

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
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: '#1a7a3c' }}>Photo Log Timeline</h2>
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d4e8d8" />
            <XAxis dataKey="date" stroke="#5a7060" tick={{ fill: "#1a2e1a" }} />
            <YAxis stroke="#5a7060" allowDecimals={false} tick={{ fill: "#1a2e1a" }} />
            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d4e8d8', color: '#1a2e1a' }} />
            <Line type="monotone" dataKey="count" stroke="#1a7a3c" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}