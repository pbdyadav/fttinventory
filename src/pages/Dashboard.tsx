// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#6366F1",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

type ModelCount = { name: string; value: number };
type DayPoint = { date: string; count: number };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Main Metrics
  const [inStockCount, setInStockCount] = useState<number>(0);
  const [totalTransfers, setTotalTransfers] = useState<number>(0);
  const [totalTests, setTotalTests] = useState<number>(0);

  // Charts
  const [dailyTransfers, setDailyTransfers] = useState<DayPoint[]>([]);
  const [modelCounts, setModelCounts] = useState<ModelCount[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1️⃣ In Stock Count
        const { data: invData } = await supabase
          .from("inventory")
          .select("id, status");

        if (mounted) {
          const count = (invData || []).filter((i: any) => i.status === "In Stock").length;
          setInStockCount(count);
        }

        // 2️⃣ Total Transfers + Daily Transfers
        const { data: transfersData } = await supabase
          .from("transfers")
          .select("id, transfer_date")
          .order("transfer_date", { ascending: false });

        if (mounted) {
          setTotalTransfers(transfersData?.length || 0);

          // Build last 14 days
          const dailyMap = new Map<string, number>();
          const now = new Date();

          for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            dailyMap.set(key, 0);
          }

          (transfersData || []).forEach((row) => {
            if (row.transfer_date) {
              const key = new Date(row.transfer_date).toISOString().slice(0, 10);
              if (dailyMap.has(key)) {
                dailyMap.set(key, dailyMap.get(key)! + 1);
              }
            }
          });

          const graph = Array.from(dailyMap.entries()).map(([date, count]) => ({
            date,
            count,
          }));

          setDailyTransfers(graph);
        }

        // 3️⃣ Total Tests
        const { data: testsData } = await supabase
          .from("laptop_tests")
          .select("id");

        if (mounted) setTotalTests(testsData?.length || 0);

        // 4️⃣ Model Donut Chart
        const { data: modelData } = await supabase
          .from("inventory")
          .select("model");

        if (mounted) {
          const map = new Map<string, number>();
          (modelData || []).forEach((row: any) => {
            const model = row.model || "Unknown";
            map.set(model, (map.get(model) || 0) + 1);
          });

          const arr = Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

          setModelCounts(arr);
        }
      } catch (err: any) {
        if (mounted) setError("Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Prepare metric boxes
  const metrics = useMemo(
    () => [
      {
        label: "In Stock",
        value: inStockCount,
        hint: "Items currently in inventory",
        color: COLORS[0],
      },
      {
        label: "Transfers",
        value: totalTransfers,
        hint: "Total transfers moved",
        color: COLORS[1],
      },
      {
        label: "Tested",
        value: totalTests,
        hint: "Total laptops tested",
        color: COLORS[3],
      },
      {
        label: "Models",
        value: modelCounts.reduce((sum, m) => sum + m.value, 0),
        hint: "Total laptop model types",
        color: COLORS[5],
      },
    ],
    [inStockCount, totalTransfers, totalTests, modelCounts]
  );

  // -------------------------------
  // UI Loading and Error Handling
  // -------------------------------
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  // -------------------------------
  // UI — Dashboard
  // -------------------------------
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Dashboard — Overview</h2>

      {/* Animated Metric Circles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, idx) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: idx * 0.07,
              type: "spring",
              stiffness: 130,
            }}
            className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg"
              style={{ background: m.color }}
            >
              {m.value}
            </div>
            <div>
              <div className="text-sm text-gray-500">{m.hint}</div>
              <div className="text-lg font-medium">{m.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-2">Transfers — Last 14 Days</h3>

          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={dailyTransfers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium mb-2">Top Models in Inventory</h3>

          <div className="w-full h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={modelCounts}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  label={(entry) => entry.name}
                >
                  {modelCounts.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
