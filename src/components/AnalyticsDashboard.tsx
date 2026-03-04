import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PropertyData {
  sold_year: number;
  property_id: number;
  property_address: string;
  closed_date_dt: string;
  status: string;
  sold_amount_num: number;
  purchase_price_num: number;
  rehab_amount_num: number;
  gross_profit_num: number;
  days_on_market_num: number;
  lead_source: string;
  agent: string;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"];

export function AnalyticsDashboard() {
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    fetchPropertyData();
  }, []);

  const fetchPropertyData = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const apiEndpoint =
        "https://your-api-endpoint.execute-api.us-east-1.amazonaws.com/properties";
      
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });

      const result = await response.json();

      if (response.ok) {
        const data = typeof result.data === "string" ? JSON.parse(result.data) : result.data;
        setProperties(data);
        setLastUpdated(new Date().toLocaleString());
      } else {
        throw new Error((result as any).error || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", color: "red", textAlign: "center" }}>
        Error: {error}
      </div>
    );
  }

  // Calculate metrics
  const totalProperties = properties.length;
  const totalRevenue = properties.reduce(
    (sum, p) => sum + (p.sold_amount_num || 0),
    0
  );
  const totalProfit = properties.reduce((sum, p) => sum + (p.gross_profit_num || 0), 0);
  const avgDaysOnMarket =
    properties.length > 0
      ? Math.round(
          properties.reduce((sum, p) => sum + (p.days_on_market_num || 0), 0) /
            properties.length
        )
      : 0;

  // Monthly data aggregation
  const monthlyData = properties
    .filter((p) => p.closed_date_dt)
    .reduce((acc: any[], p) => {
      const month = new Date(p.closed_date_dt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        existing.profit += p.gross_profit_num || 0;
        existing.revenue += p.sold_amount_num || 0;
      } else {
        acc.push({
          month,
          profit: p.gross_profit_num || 0,
          revenue: p.sold_amount_num || 0,
        });
      }
      return acc;
    }, []);

  // Profit by agent
  const profitByAgent = properties
    .filter((p) => p.agent)
    .reduce((acc: any[], p) => {
      const existing = acc.find((item) => item.agent === p.agent);
      if (existing) {
        existing.profit += p.gross_profit_num || 0;
        existing.count += 1;
      } else {
        acc.push({
          agent: p.agent,
          profit: p.gross_profit_num || 0,
          count: 1,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  // Lead sources
  const leadSources = properties
    .filter((p) => p.lead_source)
    .reduce((acc: any[], p) => {
      const existing = acc.find((item) => item.name === p.lead_source);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: p.lead_source, value: 1 });
      }
      return acc;
    }, []);

  return (
    <div style={{ padding: "40px", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <h1>Chase Pays Cash Analytics</h1>
        <p style={{ color: "#666", fontSize: "14px" }}>
          Last updated: {lastUpdated}
        </p>

        {/* Key Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <MetricCard
            title="Total Properties Sold"
            value={totalProperties.toString()}
          />
          <MetricCard
            title="Total Revenue"
            value={`$${(totalRevenue / 1000000).toFixed(2)}M`}
          />
          <MetricCard
            title="Total Profit"
            value={`$${(totalProfit / 1000000).toFixed(2)}M`}
            color="#22c55e"
          />
          <MetricCard
            title="Avg Days on Market"
            value={`${avgDaysOnMarket} days`}
          />
        </div>

        {/* Charts Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          {/* Monthly Revenue Chart */}
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h2>Monthly Revenue & Profit</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#82ca9d"
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Agent Profit Chart */}
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h2>Top Agents by Profit</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitByAgent}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="agent"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Bar dataKey="profit" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Lead Sources Pie Chart */}
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h2>Lead Sources Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSources}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadSources.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Properties Table */}
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <h2>Recent Properties</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "12px" }}>
                    Address
                  </th>
                  <th style={{ textAlign: "left", padding: "12px" }}>
                    Closed Date
                  </th>
                  <th style={{ textAlign: "left", padding: "12px" }}>
                    Sold Amount
                  </th>
                  <th style={{ textAlign: "left", padding: "12px" }}>
                    Profit
                  </th>
                  <th style={{ textAlign: "left", padding: "12px" }}>
                    Agent
                  </th>
                </tr>
              </thead>
              <tbody>
                {properties.slice(0, 10).map((prop, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px" }}>{prop.property_address}</td>
                    <td style={{ padding: "12px" }}>
                      {new Date(prop.closed_date_dt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px" }}>
                      ${prop.sold_amount_num?.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color:
                          prop.gross_profit_num > 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      ${prop.gross_profit_num?.toLocaleString()}
                    </td>
                    <td style={{ padding: "12px" }}>{prop.agent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for metric cards
function MetricCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
        {title}
      </div>
      <div style={{ fontSize: "32px", fontWeight: "bold", color: color || "#333" }}>
        {value}
      </div>
    </div>
  );
}