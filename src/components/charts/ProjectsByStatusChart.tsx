import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { loadCsv } from "../../utils/csv";
import type { ProjectRow } from "../../types/project";

interface StatusChartRow {
  status: string;
  count: number;
}

export default function ProjectsByStatusChart() {
  const [data, setData] = useState<StatusChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const rows = await loadCsv<ProjectRow>("/data/projects_v2.csv");

        const grouped = rows.reduce<Record<string, number>>((acc, row) => {
          const status = (row.stage || "Unknown").toString().trim() || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(grouped)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count);

        setData(chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading project status chart...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ background: '#f5f7f5', borderRadius: '14px', padding: '16px' }}>
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: '#1a7a3c' }}>Projects by Status</h2>
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d4e8d8" />
            <XAxis dataKey="status" stroke="#5a7060" tick={{ fill: "#1a2e1a" }} />
            <YAxis stroke="#5a7060" allowDecimals={false} tick={{ fill: "#1a2e1a" }} />
            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d4e8d8', color: '#1a2e1a' }} />
            <Bar dataKey="count" fill="#1a7a3c" radius={[4,4,4,4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}