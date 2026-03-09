import { useEffect, useState } from "react"
import { Papa } from "papaparse"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts"

interface InventoryRow {
  house: string
  purchase_Date?: string
  days_in_inventory: number
}

interface ChartData {
  house: string
  daysInInventory: number
}

export default function DaysInInventoryChart() {
  const [data, setData] = useState<ChartData[]>([])

  useEffect(() => {
    fetch("/data/inventory_days.csv")
      .then((res) => res.text())
      .then((csvText) => {
        const parsed = Papa.parse<InventoryRow>(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true
        })

        const cleaned: ChartData[] = parsed.data
          .map((row) => ({
            house: row.house,
            daysInInventory: Number(row.days_in_inventory)
          }))
          .filter((row) => !isNaN(row.daysInInventory))
          .sort((a, b) => b.daysInInventory - a.daysInInventory)
          .slice(0, 15)

        setData(cleaned)
      })
  }, [])

  return (
    <div style={{ width: "100%", height: 500 }}>
      <h2>Top Properties by Days in Inventory</h2>

      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 20, left: 120, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="house" width={200} />
          <Tooltip
            formatter={(value: number) => [`${value} days`, "Days"]}
          />
          <Bar dataKey="daysInInventory" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}