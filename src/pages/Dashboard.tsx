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
import { FiRefreshCcw } from "react-icons/fi";

const COLORS = ["#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

type ModelCount = { name: string; value: number };
type DayPoint = { date: string; count: number };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inStockCount, setInStockCount] = useState<number>(0);
  const [totalTransfers, setTotalTransfers] = useState<number>(0);
  const [totalReturns, setTotalReturns] = useState<number>(0);
  const [totalTests, setTotalTests] = useState<number>(0);

  const [dailyTransfers, setDailyTransfers] = useState<DayPoint[]>([]);
  const [modelCounts, setModelCounts] = useState<ModelCount[]>([]);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // -------------------------
        // 1) Fetch transfers (full rows for chart)
        // -------------------------
        const { data: transfersRows, count: transfersTotalExact } = await supabase
          .from("transfers")
          .select(
            "id, transfer_type, from_location, to_location, transfer_date, created_at",
            { count: "exact" }
          )
          .order("transfer_date", { ascending: false })
          .limit(1000);

        if (mounted) setTotalTransfers(transfersTotalExact ?? (transfersRows?.length ?? 0));

        // -------------------------
        // 2) Compute Returns from transfers table
        //    (transfer_type = 'purchase_return' OR to_location = 'Purchase Return to Dealer')
        // -------------------------
        const { count: returnsCount } = await supabase
          .from("transfers")
          .select("id", { count: "exact" })
          .or("transfer_type.eq.purchase_return,to_location.eq.Purchase Return to Dealer");

        if (mounted) setTotalReturns(returnsCount ?? 0);

        // -------------------------
        // 3) laptop_tests count
        // -------------------------
        const { count: testsCount } = await supabase
          .from("laptop_tests")
          .select("id", { count: "exact", head: true });

        if (mounted) setTotalTests(testsCount ?? 0);

        // -------------------------
        // 4) Compute In Stock = Tests - Transfers - Returns
        // -------------------------
        if (mounted)
          setInStockCount(
            (testsCount ?? 0) - (transfersTotalExact ?? (transfersRows?.length ?? 0)) - (returnsCount ?? 0)
          );

        // -------------------------
        // 5) Daily transfers chart (last 14 days)
        // -------------------------
        const rowsToUse = transfersRows || [];
        const daysMap = new Map<string, number>();
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          daysMap.set(d.toISOString().slice(0, 10), 0);
        }
        rowsToUse.forEach((t: any) => {
          const td = t.transfer_date || t.created_at;
          if (!td) return;
          const key = new Date(td).toISOString().slice(0, 10);
          if (daysMap.has(key)) daysMap.set(key, (daysMap.get(key) || 0) + 1);
        });
        const points: DayPoint[] = Array.from(daysMap.entries()).map(([date, count]) => ({ date, count }));
        if (mounted) setDailyTransfers(points);

        // -------------------------
        // 6) Model counts
        // -------------------------
        const { data: invModels } = await supabase.from("inventory").select("model");
        if (mounted) {
          const map = new Map<string, number>();
          (invModels || []).forEach((row: any) => {
            const name = (row.model || "Unknown").toString();
            map.set(name, (map.get(name) || 0) + 1);
          });
          const arr: ModelCount[] = Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
          setModelCounts(arr);
        }
      } catch (err: any) {
        console.error("Dashboard load error:", err);
        if (mounted) setError(err?.message || "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [refreshKey]);

  const metrics = useMemo(
    () => [
      { label: "In Stock", value: inStockCount, hint: "Items in Main Warehouse (adjusted)", color: COLORS[0] },
      { label: "Transfers", value: totalTransfers, hint: "All transfers", color: COLORS[1] },
      { label: "Returns", value: totalReturns, hint: "Total returns", color: COLORS[2] },
      { label: "Tested", value: totalTests, hint: "Laptop tests", color: COLORS[3] },
    ],
    [inStockCount, totalTransfers, totalReturns, totalTests]
  );

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-gray-600">Loading dashboard…</div></div>;
  if (error) return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-red-600">Failed to load dashboard: {error}</div></div>;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold">Dashboard — Overview</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setRefreshKey((k) => k + 1)} className="flex items-center gap-2 border rounded px-3 py-1 hover:bg-gray-100" title="Refresh">
            <FiRefreshCcw /> Refresh
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, idx) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: idx * 0.05 }} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg" style={{ background: m.color }}>
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
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Transfers — Last 14 Days</h3>
            <div className="text-sm text-gray-500">Recent activity</div>
          </div>
          {dailyTransfers.length ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={dailyTransfers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="text-sm text-gray-500">No transfer data for the last 14 days.</div>}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Top Models in Inventory</h3>
            <div className="text-sm text-gray-500">Top {modelCounts.length}</div>
          </div>
          {modelCounts.length ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={modelCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={4} label={(entry) => entry.name}>
                    {modelCounts.map((entry, i) => (<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="text-sm text-gray-500">No inventory model data available.</div>}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium">Quick Summary</h4>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>Main Warehouse (In Stock): <strong>{inStockCount}</strong></li>
            <li>Total Transfers: <strong>{totalTransfers}</strong></li>
            <li>Total Returns: <strong>{totalReturns}</strong></li>
            <li>Total Tests: <strong>{totalTests}</strong></li>
          </ul>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium">Notes</h4>
          <p className="text-sm text-gray-600">Stock is computed as <code>In Stock = Total Tests - Total Transfers - Total Returns</code>. Returns are counted from transfers with type <code>purchase_return</code> or <code>to_location = 'Purchase Return to Dealer'</code>.</p>
        </div>
      </div>
    </div>
  );
}
