import { useEffect, useState } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface InventoryRow {
  house?: string;
  purchase_Date?: string;
  days_in_inventory?: number | string;
}

interface ChartData {
  house: string;
  daysInInventory: number;
}

export default function DaysInInventoryChart() {
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    fetch("/data/inventory_days.csv")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load CSV: ${res.status}`);
        }
        return res.text();
      })
      .then((csvText) => {
        const parsed = Papa.parse<InventoryRow>(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        const cleaned: ChartData[] = parsed.data
          .map((row: InventoryRow) => ({
            house: String(row.house ?? "").trim(),
            daysInInventory: Number(row.days_in_inventory ?? 0),
          }))
          .filter(
            (row: ChartData) =>
              row.house.length > 0 && !Number.isNaN(row.daysInInventory)
          )
          .sort(
            (a: ChartData, b: ChartData) =>
              b.daysInInventory - a.daysInInventory
          ); // removed slice so all records show

        setData(cleaned);
      })
      .catch((err) => {
        console.error("Error loading inventory chart data:", err);
      });
  }, []);

  const chartHeight = Math.max(700, data.length * 25);

  return (
    <div style={{ width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
      <h2 style={{ color: "#1a2e1a" }}>Properties by Days in Inventory</h2>

      <div style={{ width: "100%", height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 20, left: 200, bottom: 10 }}
        >
          <CartesianGrid stroke="#d4e8d8" strokeDasharray="3 3" />

          <XAxis
            type="number"
            stroke="#5a7060"
            tick={{ fill: "#1a2e1a" }}
          />

          <YAxis
            type="category"
            dataKey="house"
            width={250}
            stroke="#5a7060"
            tick={{ fill: "#1a2e1a", fontSize: 12 }}
            interval={0}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #d4e8d8",
              color: "#1a2e1a",
            }}
            formatter={(value) => [
              `${String(value)} days`,
              "Days in Inventory",
            ]}
          />

          <Bar
            dataKey="daysInInventory"
            fill="#1a7a3c"
            radius={[4, 4, 4, 4]}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}