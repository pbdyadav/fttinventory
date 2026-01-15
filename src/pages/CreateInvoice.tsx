// src/pages/CreateInvoice.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import CompanyLogo from "@/assets/logo.png";

type Item = {
  laptop_id?: number | null;
  Machine_Code?: string;
  Serial_No?: string;
  Model?: string;
  CPU?: string;
  Generation?: string;
  RAM?: string;
  storage?: string;
  price?: number | string;
};

export default function CreateInvoice() {
  const { id } = useParams(); // optional laptop id
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [invoiceNoPreview, setInvoiceNoPreview] = useState("Generating...");
  const [customer, setCustomer] = useState({
    name: "",
    mobile: "",
    address: "",
    gst: "",
  });

  const [items, setItems] = useState<Item[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Payment mode: 'cash' | 'online' | 'partial'
  const [paymentMode, setPaymentMode] = useState<"cash" | "online" | "partial">(
    "cash"
  );
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);

  const STORAGE_BUCKET = "invoices";

  const COMPANY = {
    name: "FURTHERANCE TECHNOTREE PRIVATE LIMITED",
    addressLine1: "402-C, Block, Silver Mall",
    addressLine2: "8 A RNT MARG, INDORE - 452001",
    gst: "GSTIN/UIN: 23AACCF9503E1Z1",
    state: "Madhya Pradesh (23)",
    phone: "",
  };

  // generate invoice no: INV-00001 style (reads last sales id)
  const generateInvoiceNo = async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from("sales")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .single();

      const lastId = data?.id ?? 0;
      const next = Number(lastId) + 1;
      const padded = String(next).padStart(5, "0");
      return `INV-${padded}`;
    } catch (err) {
      console.warn("Invoice no generation failed:", err);
      const ts = Date.now().toString().slice(-6);
      return `INV-${ts}`;
    }
  };

  useEffect(() => {
    const start = async () => {
      setLoading(true);
      const inv = await generateInvoiceNo();
      setInvoiceNoPreview(inv);

      if (id) {
        const { data, error } = await supabase
          .from("laptop_tests")
          .select("id,MashinCode,SerialNo,Model,CPU,Gen,RAM,SSDHdd,status")
          .eq("id", Number(id))
          .single();

        if (error) {
          toast.error("Failed to load laptop: " + error.message);
          setItems([
            {
              price: "",
              Machine_Code: "",
              Serial_No: "",
              Model: "",
              CPU: "",
              Generation: "",
              RAM: "",
              storage: "",
              laptop_id: null,
            },
          ]);
        } else if (data) {
          setItems([
            {
              laptop_id: data.id,
              Machine_code: data.MashinCode?.toString() ?? "",
              Serial_no: data.SerialNo ?? "",
              Model: data.Model ?? "",
              CPU: data.CPU ?? "",
              Generation: data.Gen ?? "",
              RAM: data.RAM ?? "",
              storage: data.SSDHdd ?? "",
              price: "",
            },
          ]);
        }
      } else {
        setItems([
          {
            price: "",
            Machine_Code: "",
            Serial_No: "",
            Model: "",
            CPU: "",
            Generation: "",
            RAM: "",
            storage: "",
            laptop_id: null,
          },
        ]);
      }

      setLoading(false);
    };

    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateItem = (
    idx: number,
    field: keyof Item,
    value: string | number | null
  ) => {
    setItems((s) => {
      const copy = [...s];
      if (field === "price") copy[idx][field] = Number(value || 0);
      else copy[idx][field] = value as any;
      return copy;
    });
  };

  const addItem = () =>
    setItems((s) => [
      ...s,
      {
        laptop_id: null,
        Machine_Code: "",
        Serial_No: "",
        Model: "",
        CPU: "",
        Generation: "",
        RAM: "",
        storage: "",
        price: "",
      },
    ]);

  const removeItem = (idx: number) =>
    setItems((s) => s.filter((_, i) => i !== idx));

  const subtotal = items.reduce((sum, it) => sum + Number(it.price || 0), 0);
  const total = subtotal; // no GST scenario

  // PDF generator (classic boxed layout)
  // --- PROFESSIONAL PDF GENERATOR ---
  const generatePdfBlob = async (
    invoiceNo: string,
    saleRow: any,
    itemsList: Item[],
    customerData: any,
    dateStr: string,
    company: any
  ): Promise<Blob> => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const LEFT = 40;
    let y = 40;

    // Add company logo
    try {
      doc.addImage(CompanyLogo, "PNG", LEFT, y, 65, 55);
    } catch { }

    // Company details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(company.name, LEFT + 80, y + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(company.addressLine1, LEFT + 80, y + 32);
    doc.text(company.addressLine2, LEFT + 80, y + 46);
    doc.text(company.gst, LEFT + 80, y + 60);
    doc.text(company.state, LEFT + 80, y + 74);

    // Invoice meta
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVOICE", PAGE_WIDTH - 150, y + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNo}`, PAGE_WIDTH - 150, y + 35);
    doc.text(`Date: ${dateStr}`, PAGE_WIDTH - 150, y + 50);

    y += 110;

    // Bill To
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Bill To:", LEFT, y);

    doc.setFontSize(10);
    doc.text(customerData.name || "-", LEFT, y + 18);
    if (customerData.address) doc.text(customerData.address, LEFT, y + 34, { maxWidth: 260 });
    if (customerData.mobile) doc.text(`Contact: ${customerData.mobile}`, LEFT, y + 50);
    if (customerData.gst) doc.text(`GST: ${customerData.gst}`, LEFT, y + 66);

    y += 90;

    // Items table
    const rows = itemsList.map((it, i) => [
      (i + 1).toString(),
      it.Machine_Code || "-",
      it.Serial_No || "-",
      it.Model || "-",
      it.CPU || "-",
      it.Generation || "-",
      it.RAM || "-",
      it.storage || "-",
      `₹ ${Number(it.price || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [["#", "M.Code", "Serial No", "Model", "CPU", "Gen", "RAM", "Storage", "Price (₹)"]],
      body: rows,
      startY: y,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: {
        fillColor: [30, 120, 210],
        textColor: 255
      },
      theme: "grid",
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 45 },
        2: { cellWidth: 90 },
        3: { cellWidth: 95 },
        4: { cellWidth: 45 },
        5: { cellWidth: 35 },
        6: { cellWidth: 45 },
        7: { cellWidth: 60 },
        8: { cellWidth: 75, halign: "right" },
      },
    });

    const lastY = (doc as any).lastAutoTable.finalY;

    // Subtotal / Total (right aligned)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Subtotal:  ₹ ${subtotal.toFixed(2)}`, PAGE_WIDTH - 100, lastY + 30, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Total:  ₹ ${total.toFixed(2)}`, PAGE_WIDTH - 100, lastY + 55, {
      align: "right",
    });

    // --- TERMS BOX (EXPANDED HEIGHT + CLEAN SPACING) ---
const termsStartY = lastY + 120;   // position below table + totals
const boxWidth = PAGE_WIDTH - LEFT * 2;
const boxHeight = 130;             // increased to prevent text overflow

// Terms Border Box
doc.setDrawColor(0);
doc.rect(LEFT, termsStartY, boxWidth, boxHeight);

// Title
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("Warranty / Terms:", LEFT + 12, termsStartY + 20);

// Terms List
doc.setFont("helvetica", "normal");
doc.setFontSize(9);

const terms = [
  "1) One month piece-to-piece replacement guarantee* (not applicable for physical/water/burn damage).",
  "2) One year free service from invoice date (labor only). Parts are chargeable if required.",
  "*Replacement only if returned in original condition and verified by service team.",
];

let ty = termsStartY + 38;
terms.forEach((t) => {
  doc.text(t, LEFT + 12, ty, { maxWidth: boxWidth - 24 });
  ty += 14;
});

// --- SIGNATURE BLOCK (PLACED BELOW TERMS BOX CLEANLY) ---
const signatureY = termsStartY + boxHeight + 40;

doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text(`For ${company.name}`, PAGE_WIDTH - 280, signatureY);

doc.setFont("helvetica", "normal");
doc.text("Authorised Signatory:", PAGE_WIDTH - 280, signatureY + 28);

// Signature Line
doc.line(PAGE_WIDTH - 260, signatureY + 30, PAGE_WIDTH - 60, signatureY + 30);

// --- FOOTER ---
doc.setFontSize(8);
doc.setTextColor(120);
doc.text(
  "This is an auto-generated invoice. No digital signature required.",
  LEFT,
  signatureY + 70
);

return doc.output("blob");

  };


  // Save invoice
  const saveInvoice = async (shareOnWhatsapp = false) => {
    // validations
    if (!customer.name?.trim()) {
      toast.error("Please enter customer name.");
      return;
    }
    if (!items.length) {
      toast.error("Add at least one item.");
      return;
    }
    if (paymentMode === "partial") {
      // ensure numeric
      const c = Number(cashAmount || 0);
      const o = Number(onlineAmount || 0);
      if (c + o !== Number(total)) {
        toast(`For partial payment, Cash + Online must equal Total.`);
        return;
      }
    }

    setSaving(true);
    const invoiceNo = await generateInvoiceNo();
    setInvoiceNoPreview(invoiceNo);

    try {
      // Insert sale
      const { data: saleRow, error: saleErr } = await supabase
        .from("sales")
        .insert({
          invoice_no: invoiceNo,
          invoice_date: invoiceDate,
          customer_name: customer.name,
          customer_mobile: customer.mobile,
          customer_address: customer.address,
          customer_gst: customer.gst || null,
          total_amount: total,
          payment_mode: paymentMode,
          cash_amount: paymentMode === "cash" ? total : paymentMode === "partial" ? cashAmount : 0,
          online_amount: paymentMode === "online" ? total : paymentMode === "partial" ? onlineAmount : 0,
        })
        .select()
        .single();

      if (saleErr || !saleRow) {
        throw new Error(saleErr?.message || "Failed to create sale record");
      }
      const saleId = saleRow.id;

      // insert sales_items and update laptop status / transfers
      for (const it of items) {
        const { error: itemErr } = await supabase.from("sales_items").insert({
          sale_id: saleId,
          laptop_id: it.laptop_id ?? null,
          machine_code: it.machine_code ?? "",
          serial_no: it.serial_no ?? "",
          model: it.model ?? "",
          cpu: it.cpu ?? "",
          generation: it.generation ?? "",
          ram: it.ram ?? "",
          storage: it.storage ?? "",
          price: Number(it.price || 0),
        });
        if (itemErr) console.warn("sales_items insert error:", itemErr.message);

        if (it.laptop_id) {
          const { error: updErr } = await supabase
            .from("laptop_tests")
            .update({ status: "sold" })
            .eq("id", it.laptop_id);
          if (updErr) console.warn("laptop update error:", updErr.message);

          const { error: transferErr } = await supabase.from("transfers").insert({
            laptop_id: it.laptop_id,
            transfer_type: "sale",
            from_location: "Main Warehouse",
            to_location: "Sold",
            transfer_date: new Date().toISOString(),
            sale_invoice_id: saleId,
          });
          if (transferErr) console.warn("transfer insert error:", transferErr.message);
        }
      }

      toast.success("Invoice saved successfully.");

      // Generate PDF
      const pdfBlob = await generatePdfBlob(invoiceNo, saleRow, items, customer, invoiceDate, COMPANY);

      // Upload PDF
      const filename = `${invoiceNo}_${saleId}.pdf`;
      const path = `invoices/${filename}`;

      try {
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, pdfBlob, { contentType: "application/pdf", upsert: true });

        let publicUrl = "";
        if (uploadErr) {
          console.warn("Storage upload error:", uploadErr.message);
          // neutral toast (sonner does not have .warning in some versions)
          toast("PDF upload failed. You can still download the PDF locally.");
        } else {
          const { publicURL } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
          publicUrl = publicURL || "";
        }

        // open PDF in new tab
        try {
          const blobUrl = URL.createObjectURL(pdfBlob);
          window.open(blobUrl, "_blank");
        } catch { }

        // WhatsApp share
        if (shareOnWhatsapp) {
          const phone = (customer.mobile || "").replace(/\D/g, "");
          const waText = `Hello ${customer.name},\nYour invoice (${invoiceNo}) is ready.\n${publicUrl ? `Download PDF: ${publicUrl}` : `We couldn't upload the file. Please contact.`}`;
          const waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(waText)}`;
          window.open(waUrl, "_blank");
        }
      } catch (e) {
        console.error("upload catch", e);
        toast("Invoice saved but PDF upload failed.");
      }

      setSaving(false);
      // navigate back to inventory
      navigate("/laptop-inventory");
      return;
    } catch (err: any) {
      console.error("saveInvoice error:", err);
      toast.error("Failed to save invoice: " + (err?.message || ""));
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-gray-500">Loading invoice page...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Create Invoice</h2>

      <div className="bg-white p-4 rounded shadow">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Invoice No</label>
            <input className="border p-2 w-full" value={invoiceNoPreview} readOnly />
          </div>

          <div>
            <label className="block text-sm font-medium">Invoice Date</label>
            <input
              type="date"
              className="border p-2 w-full"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold">Customer Details</h3>
          <input className="border p-2 w-full my-2" placeholder="Customer Name" value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          <input className="border p-2 w-full my-2" placeholder="Mobile (10 digits)" value={customer.mobile}
            onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })} />
          <textarea className="border p-2 w-full my-2" placeholder="Address" value={customer.address}
            onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
          <input className="border p-2 w-full my-2" placeholder="GST No (optional)" value={customer.gst}
            onChange={(e) => setCustomer({ ...customer, gst: e.target.value })} />
        </div>

        <div className="mt-4">
          <h3 className="font-semibold">Items</h3>
          {items.map((it, idx) => (
            <div key={idx} className="p-3 border rounded mb-2 grid grid-cols-2 gap-2">
              <div>
                <input placeholder="Machine Code" className="border p-2 w-full mb-2" value={it.machine_code || ""} onChange={(e) => updateItem(idx, "Machine_Code", e.target.value)} />
                <input placeholder="Serial No" className="border p-2 w-full mb-2" value={it.serial_no || ""} onChange={(e) => updateItem(idx, "Serial_No", e.target.value)} />
                <input placeholder="Model" className="border p-2 w-full mb-2" value={it.model || ""} onChange={(e) => updateItem(idx, "Model", e.target.value)} />
                <div className="flex gap-2">
                  <input placeholder="CPU" className="border p-2 w-full" value={it.cpu || ""} onChange={(e) => updateItem(idx, "CPU", e.target.value)} />
                  <input placeholder="Generation" className="border p-2 w-full" value={it.generation || ""} onChange={(e) => updateItem(idx, "Generation", e.target.value)} />
                </div>
              </div>

              <div>
                <input placeholder="RAM" className="border p-2 w-full mb-2" value={it.ram || ""} onChange={(e) => updateItem(idx, "RAM", e.target.value)} />
                <input placeholder="Storage" className="border p-2 w-full mb-2" value={it.storage || ""} onChange={(e) => updateItem(idx, "storage", e.target.value)} />
                <input placeholder="Price (₹)" type="number" className="border p-2 w-full mb-2" value={String(it.price || "")} onChange={(e) => updateItem(idx, "price", e.target.value)} />
                {items.length > 1 && <button type="button" className="text-red-600" onClick={() => removeItem(idx)}>Remove</button>}
              </div>
            </div>
          ))}

          <div className="flex gap-2 items-center">
            <button type="button" className="bg-gray-200 px-3 py-1 rounded" onClick={addItem}>+ Add item</button>

            <div className="ml-auto space-x-2">
              <label className="mr-2">Payment:</label>
              <select value={paymentMode} onChange={(e) => { const v = e.target.value as any; setPaymentMode(v); if (v === "cash") { setCashAmount(total); setOnlineAmount(0); } if (v === "online") { setOnlineAmount(total); setCashAmount(0); } }} className="border p-2 rounded">
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="partial">Partial (Cash + Online)</option>
              </select>
            </div>
          </div>

          {paymentMode === "partial" && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input type="number" className="border p-2" placeholder="Cash amount" value={String(cashAmount || "")} onChange={(e) => setCashAmount(Number(e.target.value || 0))} />
              <input type="number" className="border p-2" placeholder="Online amount" value={String(onlineAmount || "")} onChange={(e) => setOnlineAmount(Number(e.target.value || 0))} />
              <div className="col-span-2 text-sm text-gray-600">Total must equal ₹{total.toFixed(2)} (Cash + Online)</div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <div className="inline-block text-left mr-4">
              <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
              <div className="text-lg font-semibold">Total: ₹{total.toFixed(2)}</div>
            </div>

            <div className="space-x-2">
              <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => saveInvoice(false)} disabled={saving}>
                {saving ? "Saving..." : "Save Invoice"}
              </button>

              <button type="button" className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => saveInvoice(true)} disabled={saving}>
                {saving ? "Saving..." : "Save & Share (WhatsApp)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
