import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Transfers() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transfers")
      .select("*, laptop_tests(serialNo, model)")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching transfers:", error);
    setTransfers(data || []);
    setLoading(false);
  };

  if (loading) return <p className="p-6 text-gray-500">Loading transfers...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">📦 Transfer Records</h1>
      {transfers.length === 0 ? (
        <p className="text-gray-500">No transfers recorded yet.</p>
      ) : (
        <table className="min-w-full bg-white rounded shadow text-sm">
          <thead className="bg-gray-200 text-gray-700 uppercase">
            <tr>
              <th className="p-2 text-left">Serial No</th>
              <th className="p-2 text-left">Model</th>
              <th className="p-2 text-left">To</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Contact</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{t.laptop_tests?.serialNo || "-"}</td>
                <td className="p-2">{t.laptop_tests?.model || "-"}</td>
                <td className="p-2">{t.to_location}</td>
                <td className="p-2 capitalize">{t.transfer_type}</td>
                <td className="p-2">{t.person_name}</td>
                <td className="p-2">{t.contact_info}</td>
                <td className="p-2">
                  {t.transfer_date
                    ? new Date(t.transfer_date).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-2">{t.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
