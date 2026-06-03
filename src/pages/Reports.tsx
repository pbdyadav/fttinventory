import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getFinanceDpBreakdown } from "@/lib/financeDp";
import { SALES_TEAM_OPTIONS, formatSalesmanName } from "@/lib/salesTeam";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import FTTLogo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import AdvancedFilterPanel from "@/components/AdvancedFilterPanel";

const LOCATION_OPTIONS = [
  { label: "Main Warehouse", value: "Main Warehouse" },
  { label: "FTT Retail", value: "FTT Retail" },
  { label: "Sold", value: "Sold" },
  { label: "Godown Sale", value: "Godown Sale" },
  { label: "Purchase Return to Dealer", value: "Purchase Return to Dealer" },
];

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [salesMap, setSalesMap] = useState<Record<string, any>>({});
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState(""); // <-- ADDED: Search state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    currentLocation: "",
    salesman: "",
  });
  const [user, setUser] = useState<any>(() => {
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });

  const navigate = useNavigate();

  // ✅ Restore logged-in user correctly (single source of truth)
useEffect(() => {
  const restoreUser = async () => {
    // 1️⃣ Try localStorage first
    let stored = JSON.parse(localStorage.getItem("user") || "null");

    // 2️⃣ If missing, fallback to Supabase session
    if (!stored?.email) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const authUser = session?.user;
      if (!authUser?.email) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return;
      }

      // 3️⃣ Fetch full profile once
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, full_name")
        .eq("id", authUser.id)
        .single();

      if (error || !data) {
        toast.error("Unable to load user profile");
        return;
      }

      stored = data;
      localStorage.setItem("user", JSON.stringify(data));
    }

    // 4️⃣ Set user state
    setUser(stored);
  };

  restoreUser();
}, []);

  const role = user?.role || "";
  const isAdmin = role === "Admin";
  const isAuthor = role === "Staff";

  const canExport =
    user?.email === "praveenyadav4u@gmail.com" ||
    user?.email === "adnan@gmail.com" ||
    user?.email === "fttpvtltd@gmail.com";

  // ✅ Step 2: Load reports + profiles when user ready
  useEffect(() => {
    if (!user?.email) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Load all profiles
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, email");

        const map: Record<string, any> = {};
        (profileData || []).forEach((p) => (map[p.id] = p));
        setProfiles(map);

        // Load reports
        let query = supabase
          .from("laptop_tests")
          .select("*")
          .order("created_at", { ascending: false });

        if (role === "Staff" && user?.id) {
          query = query.eq("tested_by", user.id);
        }

        const { data: reportData } = await query;
        setReports(reportData || []);

        const [{ data: salesData }, { data: salesItemsData }, { data: transfersData }] = await Promise.all([
          supabase.from("sales").select("*"),
          supabase.from("sales_items").select("*"),
          supabase
            .from("transfers")
            .select("laptop_id, to_location, transfer_date, created_at")
            .order("transfer_date", { ascending: false }),
        ]);

        const saleByLaptop: Record<string, any> = {};
        const groupedGifts: Record<string, string[]> = {};

        (salesItemsData || []).forEach((item: any) => {
          const saleId = String(item.sale_id);
          const isGift =
            item.item_type === "gift" ||
            (item.model || "").toString().startsWith("GIFT:");

          if (isGift) {
            const giftLabel =
              item.description ||
              (item.model || "").toString().replace(/^GIFT:\s*/, "") ||
              "Gift Item";
            groupedGifts[saleId] = [...(groupedGifts[saleId] || []), giftLabel];
            return;
          }

          if (item.laptop_id) {
            saleByLaptop[String(item.laptop_id)] = item;
          }
        });

        const saleMap: Record<string, any> = {};
        (salesData || []).forEach((sale: any) => {
          saleMap[String(sale.id)] = {
            ...sale,
            gift_items: groupedGifts[String(sale.id)] || [],
          };
        });

        const mergedSalesMap: Record<string, any> = {};
        Object.entries(saleByLaptop).forEach(([laptopId, saleItem]) => {
          mergedSalesMap[laptopId] = {
            item: saleItem,
            sale: saleMap[String((saleItem as any).sale_id)] || null,
          };
        });
        setSalesMap(mergedSalesMap);

        const latestLocations: Record<string, string> = {};
        (transfersData || []).forEach((transfer: any) => {
          const laptopId = String(transfer.laptop_id);
          if (!latestLocations[laptopId]) {
            latestLocations[laptopId] = transfer.to_location || "Main Warehouse";
          }
        });
        setLocationMap(latestLocations);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, role]);

  if (!user || loading) {
    return <p className="p-6 text-gray-500">Loading reports...</p>;
  }

  // ✅ Filtering logic using the search state
  const lowerSearch = search.toLowerCase();
  const filteredReports = reports.filter((item) => {
    const matchesSearch =
      item.MashinCode?.toString().toLowerCase().includes(lowerSearch) ||
      item.SerialNo?.toLowerCase().includes(lowerSearch) ||
      item.tested_by?.toLowerCase().includes(lowerSearch) ||
      item.Model?.toLowerCase().includes(lowerSearch) ||
      item.Gen?.toLowerCase().includes(lowerSearch) ||
      item.GraphicCard?.toLowerCase().includes(lowerSearch);

    if (!matchesSearch) return false;

    const testedDate = item.tested_on || item.created_at;
    const itemDate = testedDate ? new Date(testedDate) : null;
    const fromDate = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
    const toDate = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;
    const currentLocation =
      item.status === "sold" ? "Sold" : locationMap[String(item.id)] || "Main Warehouse";

    if (fromDate && (!itemDate || itemDate < fromDate)) return false;
    if (toDate && (!itemDate || itemDate > toDate)) return false;
    if (filters.currentLocation && currentLocation !== filters.currentLocation) return false;

    if (filters.salesman) {
      const saleInfo = salesMap[String(item.id)];
      if ((saleInfo?.sale?.salesman_name || "") !== filters.salesman) return false;
    }

    return true;
  });

  const clearAdvancedFilters = () => {
    setFilters({ fromDate: "", toDate: "", currentLocation: "", salesman: "" });
  };

  // ✅ Toggle selection for checkboxes
  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ✅ Get readable tester name
  const getTesterName = (tested_by: string) => {
    if (!tested_by) return "Unknown Tester";
    const profile = profiles[tested_by];
    return profile?.full_name || profile?.email || "Unknown Tester";
  };

  // ✅ Generate formatted PDF
  const generatePDF = (test: any) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    try {
      doc.addImage(FTTLogo, "PNG", 15, 10, 25, 25);
    } catch { }

    doc.setFontSize(16);
    doc.text("Furtherance Technotree Pvt Ltd, Indore", 45, 20);
    doc.setFontSize(12);
    doc.text("Laptop Full Diagnostic Report", 45, 28);

    const testerName = getTesterName(test.tested_by);
    const testedOn = test.tested_on || test.created_at || new Date().toISOString();

    doc.setFontSize(10);
    // 🕒 Convert UTC to IST (GMT+5:30)
    const testedDate = new Date(testedOn);
    const istOffsetMs = 5.5 * 60 * 60 * 1000; // +5:30 hours
    const istTime = new Date(testedDate.getTime() + istOffsetMs);

    // Format cleanly for India (DD/MM/YYYY, hh:mm:ss AM/PM)
    const formattedIST = istTime.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    doc.text(`Tested On: ${formattedIST}`, 15, 45);
    doc.text(`Tested By: ${testerName}`, 115, 45);

    const qrData = encodeURIComponent(
      JSON.stringify({
        company: "Furtherance Technotree Pvt Ltd, Indore",
        SerialNo: test.SerialNo,
        Model: test.Model,
        CPU: test.CPU,
        RAM: test.RAM,
        SSDHdd: test.SSDHdd,
        testedBy: testerName,
        testedDate: new Date(testedOn).toLocaleDateString(),
      })
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${qrData}`;
    doc.addImage(qrUrl, "PNG", 160, 10, 35, 35);

    const capitalize = (s: string) =>
      s.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();

    const tableData = Object.entries(test)
      .filter(([key]) => !["id", "created_at"].includes(key))
      .map(([key, val]) => [capitalize(key), String(val)]);

    autoTable(doc, {
      startY: 50,
      head: [["Parameter", "Result"]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.text("Authorized Signature: ____________________", 15, finalY);
    doc.text("Company Seal: ____________________", 15, finalY + 10);
    doc.save(`FTT_Laptop_Report_${test.serialNo || "N/A"}.pdf`);
  };

  // ✅ QR Sticker Printing
  const printQRSticker = (selectedTests: any[]) => {
    if (!selectedTests.length) {
      toast.error("No reports selected for QR printing.");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const marginX = 8,
      marginY = 10,
      stickerWidth = 48,
      stickerHeight = 40,
      stickersPerRow = 4,
      stickersPerPage = 24;

    let x = marginX,
      y = marginY,
      count = 0;

    selectedTests.forEach((test, i) => {
      doc.setDrawColor(200);
      doc.rect(x, y, stickerWidth, stickerHeight);

      // 🔹 Generate QR Data
      const qrData = encodeURIComponent(
        JSON.stringify({
          company: " ",
          MashinCode: test.MashinCode,
          SerialNo: test.SerialNo,
          Model: test.Model,
          testedBy: getTesterName(test.tested_by),
          testedDate: new Date(test.created_at).toLocaleDateString(),
        })
      );

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;
      const qrSize = 24; // slightly bigger for better visibility
      const qrX = x + (stickerWidth - qrSize) / 2;
      const qrY = y + 2; // slightly reduced top margin

      // 🧾 Add QR Image
      doc.addImage(qrUrl, "PNG", qrX, qrY, qrSize, qrSize);

      // 🏢 Add Logo in Center of QR (optional)
      try {
        const logoSize = 7;
        const logoX = qrX + (qrSize - logoSize) / 2;
        const logoY = qrY + (qrSize - logoSize) / 2;
        doc.addImage(FTTLogo, "PNG", logoX, logoY, logoSize, logoSize);
      } catch { }

      // 🧩 Add Text (centered and visually balanced)
      const centerX = x + stickerWidth / 2;
      const textStartY = qrY + qrSize + 4.5; // closer to QR — tight layout

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Furtherance Technotree Pvt Ltd", centerX, textStartY - 1, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Machine Code: ${test.MashinCode}`, centerX, textStartY + 2.5, { align: "center" });
      doc.text(`S/N: ${test.SerialNo}`, centerX, textStartY + 5.8, { align: "center" });


      // Optional: Add model line (if not empty)
      if (test.model) {
        doc.text(`${test.model}`, centerX, textStartY + 8.6, { align: "center" });
      }

      count++;
      if (count % stickersPerRow === 0) {
        x = marginX;
        y += stickerHeight;
        if (count % stickersPerPage === 0 && i < selectedTests.length - 1) {
          doc.addPage();
          x = marginX;
          y = marginY;
        }
      } else {
        x += stickerWidth;
      }
    });

    const blobUrl = doc.output("bloburl");
    const printWin = window.open(blobUrl);
    if (printWin) printWin.onload = () => printWin.print();
  };

  // ✅ Export All to Excel
  const exportToExcel = async () => {
    if (!reports.length) return toast.error("No data to export.");

    // Fetch all transfers (includes person_name, address, etc.)
    const { data: transfers } = await supabase
      .from("transfers")
      .select("*")
      .order("transfer_date", { ascending: false }); // ensures latest comes first

    // Map reports to include final/latest transfer data
    const formatted = reports.map((r) => {
      // 🧠 Find the latest transfer for this laptop
      const transfer = transfers?.find((t) => t.laptop_id === r.id);
      const saleInfo = salesMap[String(r.id)] || null;
      const financeBreakdown =
        saleInfo?.sale?.payment_mode === "finance_card"
          ? getFinanceDpBreakdown(saleInfo.sale)
          : null;

      return {
        MachineCode: r.MashinCode,
        Model: r.Model,
        SerialNo: r.SerialNo,
        OS: r.OS,
        Gen: r.Gen,
        CPU: r.CPU,
        RAM: r.RAM,
        Storage: r.SSDHdd,
        SSDHealth: r.SSDHealth,
        TestedBy: getTesterName(r.tested_by),
        TestedDate: new Date(r.created_at).toLocaleString(),

        // 🔁 Transfer / Receiver Info
        TransferType: transfer?.transfer_type || "—",
        ToLocation: transfer?.to_location || "—",
        FromLocation: transfer?.from_location || "—",
        TransferDate: transfer
          ? new Date(transfer.transfer_date).toLocaleString()
          : "—",
        ReceiverName: transfer?.person_name || "—",
        ReceiverContact: transfer?.contact_info || "—",
        ReceiverAddress: transfer?.address || "—",
        TransferRemarks: transfer?.remarks || "—",
        CurrentStatus: r.status || "in_stock",

        // Sale / invoice info
        SaleInvoiceNo: saleInfo?.sale?.invoice_no || "—",
        SaleDate: saleInfo?.sale?.invoice_date
          ? new Date(saleInfo.sale.invoice_date).toLocaleDateString()
          : "—",
        SaleAmount:
          saleInfo?.item?.line_total ??
          saleInfo?.item?.price ??
          "—",
        SaleCustomer: saleInfo?.sale?.customer_name || "—",
        SaleCustomerMobile: saleInfo?.sale?.customer_mobile || "—",
        SaleCustomerAddress: saleInfo?.sale?.customer_address || "—",
        SaleCustomerGST: saleInfo?.sale?.customer_gst || "—",
        SalePaymentMode: saleInfo?.sale?.payment_mode || "—",
        Salesman: formatSalesmanName(saleInfo?.sale?.salesman_name),
        DPCashAmount: financeBreakdown?.cashAmount ?? "—",
        DPOnlineAmount: financeBreakdown?.onlineAmount ?? "—",
        TotalDPAmount: financeBreakdown?.totalAmount ?? "—",
        Narration: saleInfo?.sale?.payment_narration || "—",
        SaleGiftItems: saleInfo?.sale?.gift_items?.join(", ") || "—",

        // 🗒️ Internal Remarks from test
        TestRemarks: r.remarks || "—",
      };
    });


    // ✅ Generate Excel file
    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LaptopReports");

    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `FTT_Laptop_Reports_${new Date().toISOString()}.xlsx`
    );

    toast.success("✅ Excel exported successfully!");
  };

  const selectedReports = reports.filter((r) => selected.includes(r.id));

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">📋 Laptop Diagnostic Reports</h1>

        <div className="flex gap-2">
          {canExport && (
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
            >
              ⬇️ Export All to Excel
            </button>
          )}

          <button
            onClick={() => {
              if (selectedReports.length === 0) {
                // Replaced alert with toast as per guidelines
                toast.error("⚠️ Please select at least one report to print QR stickers.");
                return;
              }
              printQRSticker(selectedReports);
            }}
            className={`px-4 py-2 rounded-lg shadow text-white ${selectedReports.length > 0
                ? "bg-purple-700 hover:bg-purple-800"
                : "bg-gray-400 cursor-not-allowed"
              }`}
          >
            🖨️ Print Selected QR Stickers
          </button>

        </div>
      </div>

      {/* 🔍 ADDED: Search Input */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <input
          type="text"
          placeholder="Search by M. Code, Serial No, Model, Graphic Card, Gen..."
          className="w-full rounded border p-2 focus:border-blue-500 focus:ring-blue-500"
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
          title="Reports Advanced Filter"
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          selectLabel="Current Location"
          selectValue={filters.currentLocation}
          selectOptions={LOCATION_OPTIONS}
          onFromDateChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
          onToDateChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
          onSelectChange={(value) => setFilters((current) => ({ ...current, currentLocation: value }))}
          secondSelectLabel="Salesman"
          secondSelectValue={filters.salesman}
          secondSelectOptions={SALES_TEAM_OPTIONS}
          onSecondSelectChange={(value) =>
            setFilters((current) => ({ ...current, salesman: value }))
          }
          onApply={() => setShowAdvancedFilter(false)}
          onClear={clearAdvancedFilters}
          onClose={() => setShowAdvancedFilter(false)}
        />
      )}
      {/* 🔍 END Search Input */}

      <div className="overflow-x-auto bg-white rounded-xl shadow border">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    // When clicking "Select All", it now only selects items in the filtered view
                    setSelected(
                      e.target.checked ? filteredReports.map((r) => r.id) : []
                    )
                  }
                  // Check if all visible reports are currently selected
                  checked={
                    filteredReports.length > 0 &&
                    filteredReports.every(r => selected.includes(r.id))
                  }
                />
              </th>
              <th className="p-3 text-left">M. Code</th>
              <th className="p-3 text-left">Serial No</th>
              <th className="p-3 text-left">Model</th>
              <th className="p-3 text-left">CPU</th>
              <th className="p-3 text-left">Genration</th>
              <th className="p-3 text-left">RAM</th>
              <th className="p-3 text-left">Storage</th>
              <th className="p-3 text-left">Graphic Card</th>
              <th className="p-3 text-left">Tested By</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* CORRECTED: The syntax error was here (an extra brace {) */}
            {filteredReports.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggleSelect(r.id)}
                  />
                </td>
                <td className="p-3">{r.MashinCode}</td>
                <td className="p-3">{r.SerialNo}</td>
                <td className="p-3">{r.Model}</td>
                <td className="p-3">{r.CPU}</td>
                <td className="p-3">{r.Gen}</td>
                <td className="p-3">{r.RAM}</td>
                <td className="p-3">{r.SSDHdd}</td>
                <td className="p-3">{r.GraphicCard}</td>
                <td className="p-3">{getTesterName(r.tested_by)}</td>
                <td className="p-3">{new Date(r.created_at).toLocaleDateString()} </td>
                <td className="p-3 text-center flex justify-center gap-2">
                  {/* 👇 Everyone can see these three */}
                  <button onClick={() => generatePDF(r)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    🧾 PDF
                  </button>

                  <button onClick={() => printQRSticker([r])}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                  >
                    🖨️ QR
                  </button>

                  <button onClick={() => navigate(`/edit-report/${r.id}`)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                  >
                    ✏️ Edit
                  </button>
                </td>
              </tr>
            ))}
            {/* Display message if no results found */}
            {filteredReports.length === 0 && reports.length > 0 && (
              <tr>
                <td colSpan={10} className="p-5 text-center text-gray-500">
                  No reports found matching your search term.
                </td>
              </tr>
            )}
            {/* Display message if reports array is empty */}
            {reports.length === 0 && (
              <tr>
                <td colSpan={10} className="p-5 text-center text-gray-500">
                  There are no reports available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
