// src/pages/InventoryTransfer.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function InventoryTransfer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const transferType = state?.type || "FTT Retail";

  const [laptop, setLaptop] = useState<any>(null);
  const [form, setForm] = useState({
    person_name: "",
    contact_info: "",
    address: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Fetch laptop details safely
  useEffect(() => {
    const fetchLaptop = async () => {
      if (!id) {
        toast.error("No laptop ID provided");
        setLoading(false);
        return;
      }

      const laptopId = Number(id);
      if (isNaN(laptopId)) {
        toast.error("Invalid laptop ID");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("laptop_tests")
        .select("*")
        .eq("id", laptopId)
        .single();

      if (error) {
        toast.error("Error loading laptop: " + error.message);
      } else {
        setLaptop(data);
      }

      setLoading(false);
    };

    fetchLaptop();
  }, [id]);

  // ✅ Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.person_name.trim()) return toast.error("Name is required");
    if (!laptop) return toast.error("Laptop not loaded yet");

    setSaving(true);
    try {
      const { error } = await supabase.from("transfers").insert([
        {
          laptop_id: laptop.id,
          transfer_type: transferType.toLowerCase(),
          to_location: transferType,
          from_location: "Main Warehouse",
          person_name: form.person_name,
          contact_info: form.contact_info,
          address: form.address,
          remarks: form.remarks,
          transfer_date: new Date().toISOString(), // ✅ auto date
        },
      ]);

      if (error) throw error;

      toast.success(`✅ ${laptop.serialNo} transferred to ${transferType}`);
      navigate("/laptop-inventory");
    } catch (err: any) {
      toast.error("❌ Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-gray-500">Loading laptop...</p>;

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto bg-white shadow-md p-6 rounded-xl">
        <h1 className="text-2xl font-semibold mb-4 text-gray-800">
          🔁 Transfer Laptop — {transferType}
        </h1>

        {laptop && (
          <div className="bg-gray-100 p-4 mb-4 rounded">
            <p>
              <strong>Machine Code:</strong> {laptop.mashincode || "-"}
            </p>
            <p>
              <strong>Model:</strong> {laptop.model || "-"}
            </p>
            <p>
              <strong>Serial No:</strong> {laptop.serialNo || "-"}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Name (Required)
            </label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={form.person_name}
              onChange={(e) =>
                setForm({ ...form, person_name: e.target.value })
              }
              required
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Contact Number
            </label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={form.contact_info}
              onChange={(e) =>
                setForm({ ...form, contact_info: e.target.value })
              }
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              className="w-full border p-2 rounded"
              rows={2}
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <textarea
              className="w-full border p-2 rounded"
              rows={2}
              value={form.remarks}
              onChange={(e) =>
                setForm({ ...form, remarks: e.target.value })
              }
            />
          </div>

          <button
            disabled={saving}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-md"
          >
            {saving ? "Saving..." : "Confirm Transfer"}
          </button>
        </form>
      </div>
    </div>
  );
}
