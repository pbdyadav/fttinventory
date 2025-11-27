// src/pages/LaptopInventory.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function LaptopInventory() {
  const [laptops, setLaptops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");   // ✅ NEW
  const navigate = useNavigate();

  useEffect(() => {
    fetchLaptops();
  }, []);

  // ✅ Fetch laptops + latest transfer info
  const fetchLaptops = async () => {
    setLoading(true);

    const { data: laptopsData, error } = await supabase
      .from("laptop_tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error fetching laptops: " + error.message);
      setLoading(false);
      return;
    }

    // Attach latest transfer info
    const enriched = await Promise.all(
      (laptopsData || []).map(async (lap) => {
        const { data: transfer } = await supabase
          .from("transfers")
          .select("to_location")
          .eq("laptop_id", lap.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...lap,
          current_location: transfer?.to_location || "Main Warehouse",
        };
      })
    );

    setLaptops(enriched);
    setLoading(false);
  };

  const handleTransfer = async (laptop: any, type: string) => {
    if (!type) return;

    if (laptop.current_location !== "Main Warehouse" && type !== "Return to Warehouse") {
      toast.error(
        `❌ ${laptop.serialNo} is currently at ${laptop.current_location}. It must return to Main Warehouse before transferring again.`
      );
      return;
    }

    try {
      if (type === "FTT Retail") {
        const { data: existing, error: checkError } = await supabase
          .from("transfers")
          .select("id")
          .eq("laptop_id", laptop.id)
          .eq("to_location", "FTT Retail")
          .limit(1);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
          toast.error(`⚠️ ${laptop.serialNo} already transferred to FTT Retail.`);
          return;
        }

        const { error } = await supabase.from("transfers").insert({
          laptop_id: laptop.id,
          transfer_type: "retail",
          to_location: "FTT Retail",
          from_location: laptop.current_location || "Main Warehouse",
          transfer_date: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success(`${laptop.serialNo} transferred to FTT Retail ✅`);
        fetchLaptops();
        return;
      }

      if (type === "Return to Warehouse") {
        const { error } = await supabase.from("transfers").insert({
          laptop_id: laptop.id,
          transfer_type: "warehouse",
          to_location: "Main Warehouse",
          from_location: laptop.current_location,
          transfer_date: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success(`${laptop.serialNo} returned to Main Warehouse ✅`);
        fetchLaptops();
        return;
      }

      const normalizedType =
        type === "Godown Sale"
          ? "godown"
          : type === "Purchase Return to Dealer"
          ? "purchase_return"
          : type.toLowerCase();

      navigate(`/transfer/${laptop.id}`, { state: { type, normalizedType } });
    } catch (err: any) {
      toast.error("Error transferring: " + err.message);
      console.error(err);
    }
  };

  if (loading) return <p className="text-gray-500 p-4">Loading inventory...</p>;

  // ✅ FILTERED LIST (New)
  const filteredLaptops = laptops.filter((item) =>
    item.mashincode?.toString().includes(search.toLowerCase()) ||
    item.serialNo?.toLowerCase().includes(search.toLowerCase()) ||
    item.model?.toLowerCase().includes(search.toLowerCase()) ||
    item.graphiccard?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">💻 Laptop Inventory</h1>

      {/* ✅ SEARCH BAR */}
      <input
        type="text"
        placeholder="Search: M. Code, Serial No, Model, Graphic Card..."
        className="border p-2 rounded w-full mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto bg-white rounded-2xl shadow-lg border border-gray-200">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 text-gray-700 uppercase tracking-wide">
            <tr>
              <th className="p-3 text-left w-[8%]">Machine Code</th>
              <th className="p-3 text-left w-[15%]">Serial No</th>
              <th className="p-3 text-left w-[15%]">Model</th>
              <th className="p-3 text-left w-[10%]">CPU</th>
              <th className="p-3 text-left w-[10%]">RAM</th>
              <th className="p-3 text-left w-[10%]">Storage</th>
              <th className="p-3 text-left w-[10%]">Graphic Card</th>
              <th className="p-3 text-left w-[15%]">Current Location</th>
              <th className="p-3 text-center w-[10%]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredLaptops.map((laptop, i) => (
              <tr
                key={laptop.id}
                className={`${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-amber-50 transition`}
              >
                <td className="p-3 font-medium">{laptop.mashincode || "-"}</td>
                <td className="p-3">{laptop.serialNo || "-"}</td>
                <td className="p-3">{laptop.model || "-"}</td>
                <td className="p-3">{laptop.cpu || "-"}</td>
                <td className="p-3">{laptop.ram || "-"}</td>
                <td className="p-3">{laptop.ssdHdd || "-"}</td>
                <td className="p-3">{laptop.graphiccard || "-"}</td>
                <td className="p-3 font-medium text-blue-700">
                  {laptop.current_location}
                </td>
                <td className="p-3 text-center">
                  <select
                    onChange={(e) => handleTransfer(laptop, e.target.value)}
                    className="border border-gray-400 rounded-md p-1 text-sm bg-white"
                  >
                    <option value="">Transfer...</option>
                    <option value="FTT Retail">FTT Retail</option>
                    <option value="Godown Sale">Godown Sale</option>
                    <option value="Purchase Return to Dealer">
                      Purchase Return to Dealer
                    </option>
                    <option value="Return to Warehouse">Return to Warehouse</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}
