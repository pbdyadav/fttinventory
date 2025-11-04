import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import FTTLogo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role;
  const isAdmin = role === "Admin";
  const isAuthor = role === "Staff";

  // ✅ allowed Excel users
  const canExport =
    user.email === "praveenyadav4u@gmail.com" ||
    user.email === "fttpvtltd@gmail.com";

  useEffect(() => {
    fetchProfiles();
    fetchReports();
  }, []);

  // ✅ Load profiles for name mapping
  const fetchProfiles = async () => {
    const { data, error } = await supabase.from("profiles").select("id, display_name, email");
    if (!error && data) {
      const map: Record<string, any> = {};
      data.forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("laptop_tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (role === "Staff" && user?.id) {
      query = query.eq("tested_by", user.id);
    }

    const { data, error } = await query;
    if (error) toast.error("Error loading reports: " + error.message);
    setReports(data || []);
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ✅ Get readable name
  const getTesterName = (tested_by: string) => {
    if (!tested_by) return "Unknown Tester";
    const profile = profiles[tested_by];
    return profile?.display_name || profile?.email || "Unknown Tester";
  };

  // ✅ Generate formatted PDF
  const generatePDF = (test: any) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    try {
      doc.addImage(FTTLogo, "PNG", 15, 10, 25, 25);
    } catch (err) {
      console.warn("Logo load error:", err);
    }

    doc.setFontSize(16);
    doc.text("Furtherance Technotree Pvt Ltd, Indore", 45, 20);
    doc.setFontSize(12);
    doc.text("Laptop Full Diagnostic Report", 45, 28);

    const testerName = getTesterName(test.tested_by);
    const testedOn = test.tested_on || test.created_at || new Date().toISOString();

    doc.setFontSize(10);
    doc.text(`Tested On: ${new Date(testedOn).toLocaleString()}`, 15, 45);
    doc.text(`Tested By: ${testerName}`, 120, 45);

    const qrData = encodeURIComponent(
      JSON.stringify({
        company: "Furtherance Technotree Pvt Ltd, Indore",
        serialNo: test.serialNo,
        model: test.model,
        cpu: test.cpu,
        ram: test.ram,
        ssdHdd: test.ssdHdd,
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

      const qrData = encodeURIComponent(
        JSON.stringify({
          company: "Furtherance Technotree Pvt Ltd, Indore",
          mashincode: test.mashincode,
          serialNo: test.serialNo,
          model: test.model,
          testedBy: getTesterName(test.tested_by),
          testedDate: new Date(test.created_at).toLocaleDateString(),
        })
      );
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;
      const qrSize = 24,
        qrX = x + (stickerWidth - qrSize) / 2,
        qrY = y + 4;

      doc.addImage(qrUrl, "PNG", qrX, qrY, qrSize, qrSize);

      try {
        const logoSize = 7;
        doc.addImage(
          FTTLogo,
          "PNG",
          qrX + (qrSize - logoSize) / 2,
          qrY + (qrSize - logoSize) / 2,
          logoSize,
          logoSize
        );
      } catch {}

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Furtherance Technotree Pvt Ltd", x + 3, y + 33);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`S/N: ${test.serialNo}`, x + 12, y + 37);

      count++;
      if (count % stickersPerRow === 0) {
        x = marginX;
        y += stickerHeight;
        if (count % stickersPerPage === 0 && i < selectedTests.length - 1) {
          doc.addPage();
          x = marginX;
          y = marginY;
        }
      } else x += stickerWidth;
    });

    const blobUrl = doc.output("bloburl");
    const printWin = window.open(blobUrl);
    if (printWin) printWin.onload = () => printWin.print();
  };

  const exportToExcel = async () => {
    if (!reports.length) return toast.error("No data to export.");

    const { data: transfers, error: tErr } = await supabase
      .from("transfers")
      .select("*");
    if (tErr) console.warn("Transfer fetch error:", tErr);

    const formatted = reports.map((r) => {
      const transfer = transfers?.find((t) => t.laptop_id === r.id);
      return {
        MachineCode: r.mashincode,
        Model: r.model,
        SerialNo: r.serialNo,
        OS: r.os,
        Gen: r.gen,
        CPU: r.cpu,
        RAM: r.ram,
        Storage: r.ssdHdd,
        SSDHealth: r.ssdHealth,
        TestedBy: getTesterName(r.tested_by),
        TestedDate: new Date(r.created_at).toLocaleString(),
        TransferType: transfer?.transfer_type || "—",
        ToLocation: transfer?.to_location || "—",
        TransferDate: transfer
          ? new Date(transfer.transfer_date).toLocaleDateString()
          : "—",
        Remarks: r.remarks,
      };
    });

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

  if (loading) return <p className="p-6 text-gray-500">Loading reports...</p>;

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

          {(isAdmin || isAuthor) && (
            <button
              onClick={() => printQRSticker(selectedReports)}
              className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg shadow"
            >
              🖨️ Print Selected QR Stickers
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow border">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? reports.map((r) => r.id) : []
                    )
                  }
                  checked={selected.length === reports.length}
                />
              </th>
              <th className="p-3 text-left">Machine Code</th>
              <th className="p-3 text-left">Serial No</th>
              <th className="p-3 text-left">Model</th>
              <th className="p-3 text-left">CPU</th>
              <th className="p-3 text-left">RAM</th>
              <th className="p-3 text-left">Storage</th>
              <th className="p-3 text-left">Tested By</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggleSelect(r.id)}
                  />
                </td>
                <td className="p-3">{r.mashincode}</td>
                <td className="p-3">{r.serialNo}</td>
                <td className="p-3">{r.model}</td>
                <td className="p-3">{r.cpu}</td>
                <td className="p-3">{r.ram}</td>
                <td className="p-3">{r.ssdHdd}</td>
                <td className="p-3">{getTesterName(r.tested_by)}</td>
                <td className="p-3">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-center flex justify-center gap-2">
                  {(isAdmin || r.tested_by === user.id) && (
                    <>
                      <button
                        onClick={() => generatePDF(r)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        🧾 PDF
                      </button>
                      <button
                        onClick={() => printQRSticker([r])}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                      >
                        🖨️ QR
                      </button>
                    </>
                  )}
                  {(isAdmin || isAuthor) && (
                    <button
                      onClick={() => navigate(`/edit-report/${r.id}`)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
