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
        const rows = await loadCsv<ProjectRow>("/data/projects.csv");

        const grouped = rows.reduce<Record<string, number>>((acc, row) => {
          const status = (row.status || "Unknown").toString().trim() || "Unknown";
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
    <div className="rounded-2xl bg-slate-900 p-4 shadow-lg">
      <h2 className="mb-4 text-xl font-semibold text-white">Projects by Status</h2>
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" stroke="#ffffff" />
            <YAxis stroke="#ffffff" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}