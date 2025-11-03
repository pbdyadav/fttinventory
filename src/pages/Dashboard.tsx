// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

export default function Dashboard() {
  const [summary, setSummary] = useState({
    totalLaptops: 0,
    totalTransfers: 0,
    availableStock: 0,
  });
  const [brandStats, setBrandStats] = useState<any[]>([]);
  const [transferStats, setTransferStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchSummary();
    fetchBrandStats();
    fetchTransferStats();
    fetchRecentActivities();
  }, []);

  const fetchSummary = async () => {
    const { data: laptops } = await supabase.from("laptop_tests").select("*");
    const { data: transfers } = await supabase.from("transfers").select("*");

    const totalLaptops = laptops?.length || 0;
    const totalTransfers = transfers?.length || 0;
    const availableStock = totalLaptops - totalTransfers;

    setSummary({ totalLaptops, totalTransfers, availableStock });
  };

  const fetchBrandStats = async () => {
    const { data } = await supabase.from("laptop_tests").select("brand");
    if (!data) return;

    const counts: Record<string, number> = {};
    data.forEach((l) => (counts[l.brand] = (counts[l.brand] || 0) + 1));
    setBrandStats(Object.keys(counts).map((b) => ({ brand: b, count: counts[b] })));
  };

  const fetchTransferStats = async () => {
    const { data } = await supabase.from("transfers").select("transfer_type");
    if (!data) return;

    const counts: Record<string, number> = {};
    data.forEach((t) => (counts[t.transfer_type] = (counts[t.transfer_type] || 0) + 1));
    setTransferStats(
      Object.keys(counts).map((k) => ({ name: k.toUpperCase(), value: counts[k] }))
    );
  };

  const fetchRecentActivities = async () => {
    const { data } = await supabase
      .from("transfers")
      .select("*, laptop_id (serialNo, brand, model)")
      .order("created_at", { ascending: false })
      .limit(10);

    setRecentActivities(data || []);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* Main Content */}
      <div className="flex-1 space-y-8">
        <h1 className="text-3xl font-semibold">📊 Inventory Dashboard</h1>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card title="Total Laptops" value={summary.totalLaptops} icon="💻" color="blue" />
          <Card title="Available Stock" value={summary.availableStock} icon="📦" color="green" />
          <Card title="Total Transfers" value={summary.totalTransfers} icon="🚚" color="amber" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brand Chart */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-4">Laptops by Brand</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={brandStats}>
                <XAxis dataKey="brand" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Transfer Type Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-4">Transfer Types</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={transferStats}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {transferStats.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="lg:w-80 bg-white shadow-md rounded-xl p-5 h-fit">
        <h2 className="text-lg font-semibold mb-3">🕑 Recent Activity</h2>
        <div className="divide-y">
          {recentActivities.length > 0 ? (
            recentActivities.map((a) => (
              <div key={a.id} className="py-3 text-sm">
                <p className="font-medium text-gray-800">
                  {a.laptop_id?.brand} {a.laptop_id?.model}
                </p>
                <p className="text-gray-500">
                  → {a.to_location} ({a.transfer_type})
                </p>
                <p className="text-gray-400 text-xs">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No recent activity</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Card({ title, value, icon, color }: any) {
  const colors: any = {
    blue: "border-blue-500",
    green: "border-green-500",
    amber: "border-amber-500",
  };

  return (
    <div className={`bg-white shadow-md rounded-xl p-5 border-l-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-sm">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
