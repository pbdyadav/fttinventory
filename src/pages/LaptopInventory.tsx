// src/pages/LaptopInventory.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AdvancedFilterPanel from "@/components/AdvancedFilterPanel";
import PaginationControls from "@/components/PaginationControls";

const LOCATION_OPTIONS = [
  { label: "Main Warehouse", value: "Main Warehouse" },
  { label: "FTT Retail", value: "FTT Retail" },
  { label: "Sold", value: "Sold" },
  { label: "Godown Sale", value: "Godown Sale" },
  { label: "Purchase Return to Dealer", value: "Purchase Return to Dealer" },
];

export default function LaptopInventory() {
  const [laptops, setLaptops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");   // ✅ NEW
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [pageSize, setPageSize] = useState<25 | 50 | 100 | 250 | "all">(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    currentLocation: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchLaptops();
  }, []);

  // ✅ Fetch laptops + latest transfer info
  const fetchLaptops = async () => {
    setLoading(true);

    const { data: laptopsData, error } = await supabase
      .from("laptop_tests")
      .select("id, MashinCode, SerialNo, Model, CPU, Gen, RAM, SSDHdd, GraphicCard, touch, status, created_at")
      
      .order("created_at", { ascending: false });


    if (error) {
      toast.error("Error fetching laptops: " + error.message);
      setLoading(false);
      return;
    }

    // Attach latest transfer info
    const laptopIds = (laptopsData || []).map((l: any) => l.id);
    const latestTransfersMap: Record<string, string> = {};

    if (laptopIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < laptopIds.length; i += chunkSize) {
        const chunk = laptopIds.slice(i, i + chunkSize);
        const { data: transfersChunk } = await supabase
          .from("transfers")
          .select("laptop_id, to_location")
          .in("laptop_id", chunk)
          .order("created_at", { ascending: false });

        if (transfersChunk) {
          transfersChunk.forEach((t: any) => {
            if (!latestTransfersMap[t.laptop_id]) {
              latestTransfersMap[t.laptop_id] = t.to_location;
            }
          });
        }
      }
    }

    const enriched = (laptopsData || []).map((lap) => ({
      ...lap,
      current_location: latestTransfersMap[lap.id] || "Main Warehouse",
    }));

    setLaptops(enriched);
    setLoading(false);
  };

  const handleTransfer = async (laptop: any, type: string) => {

    // Normalize sale option
    const isSale = type === "Sale (Invoice)";
    const isGodownSale = type === "Godown Sale";

    // ✅ Allow SALE from ANY location
    if (isSale) {
      navigate(`/invoice/${laptop.id}`, {
        state: {
          currentLocation: laptop.current_location || "Main Warehouse",
          saleMode: "sale",
        },
      });
      return;
    }

    if (isGodownSale) {
      navigate(`/invoice/${laptop.id}`, {
        state: {
          currentLocation: laptop.current_location || "Main Warehouse",
          saleMode: "godown",
        },
      });
      return;
    }

    // Stop if no selection
    if (!type) return;

    // ❌ Remove warehouse restriction for Sale
if (type !== "Sale (Invoice)" && laptop.current_location !== "Main Warehouse" && type !== "Return to Warehouse") {
  toast.error(
    `${laptop.serialNo} is currently at ${laptop.current_location}. It must return to Main Warehouse before transferring again.`
  );
  return;
}

    try {
      // --- FTT RETAIL ---
      if (type === "FTT Retail") {
        const { data: existing, error: checkError } = await supabase
          .from("transfers")
          .select("id")
          .eq("laptop_id", laptop.id)
          .eq("to_location", "FTT Retail")
          .limit(1);

        if (checkError) throw checkError;

        if (existing && existing.length > 0 && laptop.current_location === "FTT Retail") {
          toast.error(`⚠️ ${laptop.SerialNo || laptop.MashinCode || "Laptop"} already transferred to FTT Retail.`);
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
        toast.success(`${laptop.SerialNo || laptop.MashinCode || "Laptop"} transferred to FTT Retail ✅`);
        fetchLaptops();
        return;
      }

      // --- RETURN TO WAREHOUSE ---
      if (type === "Return to Warehouse") {
        const { error } = await supabase.from("transfers").insert({
          laptop_id: laptop.id,
          transfer_type: "warehouse",
          to_location: "Main Warehouse",
          from_location: laptop.current_location,
          transfer_date: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success(`${laptop.SerialNo || laptop.MashinCode || "Laptop"} returned to Main Warehouse ✅`);
        fetchLaptops();
        return;
      }

      // --- PURCHASE RETURN / GODOWN ---
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


  // ✅ FILTERED LIST (New)
  const filteredLaptops = useMemo(
    () =>
      laptops
    .filter((item) =>
      item.MashinCode?.toString().includes(search.toLowerCase()) ||
      item.SerialNo?.toLowerCase().includes(search.toLowerCase()) ||
      item.Model?.toLowerCase().includes(search.toLowerCase()) ||
      item.Gen?.toLowerCase().includes(search.toLowerCase()) ||
      item.GraphicCard?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((item) => {
      const itemDate = item.created_at ? new Date(item.created_at) : null;
      const fromDate = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
      const toDate = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;
      const currentLocation =
        item.status === "sold" ? "Sold" : item.current_location || "Main Warehouse";

      if (!filters.currentLocation && item.status === "sold") return false;
      if (fromDate && (!itemDate || itemDate < fromDate)) return false;
      if (toDate && (!itemDate || itemDate > toDate)) return false;
      if (filters.currentLocation && currentLocation !== filters.currentLocation) return false;

      return true;
    }),
    [laptops, search, filters]
  );

  const pageSizeValue = pageSize === "all" ? filteredLaptops.length || 1 : pageSize;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredLaptops.length / pageSizeValue));

  const paginatedLaptops = useMemo(() => {
    if (pageSize === "all") return filteredLaptops;
    const startIndex = (currentPage - 1) * pageSizeValue;
    return filteredLaptops.slice(startIndex, startIndex + pageSizeValue);
  }, [filteredLaptops, currentPage, pageSize, pageSizeValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filters.fromDate, filters.toDate, filters.currentLocation, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handlePageSizeChange = (nextSize: 25 | 50 | 100 | 250 | "all") => {
    setPageSize(nextSize);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const table = document.getElementById("inventory-table-scroll");
    table?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearAdvancedFilters = () => {
    setFilters({ fromDate: "", toDate: "", currentLocation: "" });
  };

  if (loading) return <p className="text-gray-500 p-4">Loading inventory...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">💻 Laptop Inventory</h1>

      {/* ✅ SEARCH BAR */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <input
          type="text"
          placeholder="Search: M. Code, Serial No, Model, Graphic Card, Gen..."
          className="w-full rounded border p-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowAdvancedFilter(true)}
          className="whitespace-nowrap rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-900"
        >
          Advanced Filter
        </button>
      </div>

      {showAdvancedFilter && (
        <AdvancedFilterPanel
          title="Inventory Advanced Filter"
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          selectLabel="Current Location"
          selectValue={filters.currentLocation}
          selectOptions={LOCATION_OPTIONS}
          onFromDateChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
          onToDateChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
          onSelectChange={(value) => setFilters((current) => ({ ...current, currentLocation: value }))}
          onApply={() => setShowAdvancedFilter(false)}
          onClear={clearAdvancedFilters}
          onClose={() => setShowAdvancedFilter(false)}
        />
      )}

      <div
        id="inventory-table-scroll"
        className="overflow-auto bg-white rounded-2xl shadow-lg border border-gray-200"
        style={{ maxHeight: "calc(100vh - 22rem)" }}
      >
        <table className="min-w-full text-sm text-gray-800">
          <thead className="sticky top-0 z-10 bg-gray-100 text-gray-700 uppercase tracking-wide">
            <tr>
              <th className="p-3 text-left w-[8%]">Machine Code</th>
              <th className="p-3 text-left w-[15%]">Serial No</th>
              <th className="p-3 text-left w-[15%]">Model</th>
              <th className="p-3 text-left w-[10%]">CPU</th>
              <th className="p-3 text-left w-[10%]">Genration</th>
              <th className="p-3 text-left w-[10%]">RAM</th>
              <th className="p-3 text-left w-[10%]">Storage</th>
              <th className="p-3 text-left w-[10%]">Graphic Card</th>
              <th className="p-3 text-left w-[10%]">Touch Screen</th>
              <th className="p-3 text-left w-[15%]">Current Location</th>
              <th className="p-3 text-center w-[10%]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedLaptops.map((laptop, i) => (
              <tr
                key={laptop.id}
                className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-amber-50 transition`}
              >
                <td className="p-3 font-medium">{laptop.MashinCode || "-"}</td>
                <td className="p-3">{laptop.SerialNo || "-"}</td>
                <td className="p-3">{laptop.Model || "-"}</td>
                <td className="p-3">{laptop.CPU || "-"}</td>
                <td className="p-3">{laptop.Gen || "-"}</td>
                <td className="p-3">{laptop.RAM || "-"}</td>
                <td className="p-3">{laptop.SSDHdd || "-"}</td>
                <td className="p-3">{laptop.GraphicCard || "-"}</td>
                <td className="p-3">{laptop.touch || "-"}</td>
                <td className="p-3 font-medium">
                  {laptop.status === "sold" ? (
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded">
                      SOLD
                    </span>
                  ) : (
                    <span className="text-blue-700">{laptop.current_location}</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <select
                    onChange={(e) => handleTransfer(laptop, e.target.value)}
                    className="border border-gray-400 rounded-md p-1 text-sm bg-white"
                  >
                    <option value="">Transfer...</option>
                    <option value="FTT Retail">FTT Retail</option>
                    <option value="Godown Sale">Godown Sale</option>
                    <option value="Sale (Invoice)">Sale (Invoice)</option>
                    <option value="Purchase Return to Dealer">Purchase Return to Dealer</option>
                    <option value="Return to Warehouse">Return to Warehouse</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      <div className="mt-4">
        <PaginationControls
          totalItems={filteredLaptops.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
