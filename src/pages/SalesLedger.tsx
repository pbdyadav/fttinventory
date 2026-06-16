import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import FinanceDpDetails from "@/components/FinanceDpDetails";
import { getFinanceDpRemarks } from "@/lib/financeDp";
import { SALES_TEAM_OPTIONS, formatSalesmanName } from "@/lib/salesTeam";

type SaleRow = {
  id: number;
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  customer_mobile: string;
  customer_address: string | null;
  customer_gst: string | null;
  total_amount: number;
  payment_mode: string | null;
  cash_amount: number | null;
  online_amount: number | null;
  finance_dp_amount?: number | null;
  dp_payment_mode?: string | null;
  partial_dp_cash_amount?: number | null;
  partial_dp_online_amount?: number | null;
  payment_narration?: string | null;
  installment_count?: number | null;
  salesman_name?: string | null;
};

type SaleItemRow = {
  id: number;
  sale_id?: number | null;
  invoice_id?: number | null;
  model?: string | null;
  machine_code?: string | null;
  serial_no?: string | null;
  quantity?: number | null;
  line_total?: number | null;
  price?: number | null;
  item_type?: string | null;
  description?: string | null;
};

type PaymentRow = {
  id: number;
  sale_id: number | null;
  customer_name: string | null;
  customer_mobile: string | null;
  payment_date: string;
  amount: number;
  payment_mode: string | null;
  remarks: string | null;
};

type LedgerCustomer = {
  key: string;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  customer_gst: string;
  sales: SaleRow[];
  payments: PaymentRow[];
  totalSales: number;
  totalReceived: number;
  outstandingBalance: number;
  lastTransactionDate: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const getCustomerKey = (name: string | null, mobile: string | null) => {
  const cleanMobile = (mobile || "").replace(/\D/g, "");
  const cleanName = (name || "Unknown Customer").trim().toLowerCase();
  return cleanMobile || cleanName;
};

const isFinanceMode = (mode: string | null | undefined) => 
  mode === "finance_card" || mode === "bajaj_card" || mode === "credit_card";

const getPaymentLabel = (paymentMode: string | null) => {
  if (paymentMode === "cash") return "Cash";
  if (paymentMode === "online") return "Online";
  if (paymentMode === "partial") return "Partial (Cash + Online)";
  if (paymentMode === "bajaj_card") return "Bajaj Card";
  if (paymentMode === "credit_card") return "Credit Card";
  if (paymentMode === "finance_card") return "Bajaj / Credit Card";
  if (paymentMode === "on_credit") return "On Credit";
  if (paymentMode === "parcel_payment") return "Parcel Payment";
  return paymentMode || "-";
};

const getInvoiceReceivedAmount = (sale: SaleRow) => {
  if (isFinanceMode(sale.payment_mode)) {
    return Number(sale.total_amount || 0);
  }

  return Number(sale.cash_amount || 0) + Number(sale.online_amount || 0);
};

const getInvoiceNumbers = (sales: SaleRow[]) =>
  sales.map((sale) => sale.invoice_no).filter(Boolean).join(", ");

const getSalesmanNames = (sales: SaleRow[]) => {
  const names = sales
    .map((sale) => (sale.salesman_name || "").trim())
    .filter(Boolean);
  return [...new Set(names)].join(", ") || "-";
};

const getInvoicePreview = (sales: SaleRow[]) => {
  const invoiceNumbers = sales.map((sale) => sale.invoice_no).filter(Boolean);
  if (invoiceNumbers.length <= 2) return invoiceNumbers.join(", ") || "-";
  return `${invoiceNumbers.slice(0, 2).join(", ")} +${invoiceNumbers.length - 2} more`;
};

const getSaleDateValue = (sale: SaleRow) =>
  sale.invoice_date ? new Date(`${sale.invoice_date}T00:00:00`).getTime() : 0;

const getPaymentDateValue = (payment: PaymentRow) =>
  payment.payment_date ? new Date(payment.payment_date).getTime() : 0;

export default function SalesLedger() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");

  useEffect(() => {
    const loadLedger = async () => {
      setLoading(true);

      const [{ data: salesData, error: salesError }, { data: itemsData, error: itemsError }] =
        await Promise.all([
          supabase.from("sales").select("*").order("invoice_date", { ascending: false }),
          supabase.from("sales_items").select("*").order("sale_id", { ascending: false }),
        ]);

      if (salesError) {
        toast.error("Unable to load sales ledger.");
        console.error("Ledger sales error:", salesError);
      }

      if (itemsError) {
        console.warn("Ledger sales item warning:", itemsError.message);
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from("sales_payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (paymentError) {
        console.warn("sales_payments table not available yet:", paymentError.message);
      }

      setSales((salesData || []) as SaleRow[]);
      setSaleItems((itemsData || []) as SaleItemRow[]);
      setPayments((paymentData || []) as PaymentRow[]);
      setLoading(false);
    };

    loadLedger();
  }, []);

  const ledgerCustomers = useMemo<LedgerCustomer[]>(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    const map = new Map<string, LedgerCustomer>();

    sales.forEach((sale) => {
      const saleTime = getSaleDateValue(sale);
      if (from && saleTime < from) return;
      if (to && saleTime > to) return;
      if (salesmanFilter && (sale.salesman_name || "") !== salesmanFilter) return;

      const key = getCustomerKey(sale.customer_name, sale.customer_mobile);
      const current =
        map.get(key) ||
        {
          key,
          customer_name: sale.customer_name || "Unknown Customer",
          customer_mobile: sale.customer_mobile || "",
          customer_address: sale.customer_address || "",
          customer_gst: sale.customer_gst || "",
          sales: [],
          payments: [],
          totalSales: 0,
          totalReceived: 0,
          outstandingBalance: 0,
          lastTransactionDate: sale.invoice_date,
        };

      current.sales.push(sale);
      current.totalSales += Number(sale.total_amount || 0);
      current.totalReceived += getInvoiceReceivedAmount(sale);
      if (saleTime > new Date(current.lastTransactionDate || 0).getTime()) {
        current.lastTransactionDate = sale.invoice_date;
      }
      map.set(key, current);
    });

    payments.forEach((payment) => {
      const paymentTime = getPaymentDateValue(payment);
      if (from && paymentTime < from) return;
      if (to && paymentTime > to) return;

      const sale = payment.sale_id
        ? sales.find((entry) => entry.id === payment.sale_id)
        : null;
      const key = getCustomerKey(
        payment.customer_name || sale?.customer_name || null,
        payment.customer_mobile || sale?.customer_mobile || null
      );

      const current =
        map.get(key) ||
        {
          key,
          customer_name: payment.customer_name || sale?.customer_name || "Unknown Customer",
          customer_mobile: payment.customer_mobile || sale?.customer_mobile || "",
          customer_address: sale?.customer_address || "",
          customer_gst: sale?.customer_gst || "",
          sales: [],
          payments: [],
          totalSales: 0,
          totalReceived: 0,
          outstandingBalance: 0,
          lastTransactionDate: payment.payment_date,
        };

      current.payments.push(payment);
      current.totalReceived += Number(payment.amount || 0);
      if (paymentTime > new Date(current.lastTransactionDate || 0).getTime()) {
        current.lastTransactionDate = payment.payment_date;
      }
      map.set(key, current);
    });

    return Array.from(map.values())
      .map((customer) => ({
        ...customer,
        outstandingBalance: customer.totalSales - customer.totalReceived,
      }))
      .filter((customer) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return [
          customer.customer_name,
          customer.customer_mobile,
          customer.customer_address,
          customer.customer_gst,
          getInvoiceNumbers(customer.sales),
          getSalesmanNames(customer.sales),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }, [fromDate, payments, sales, search, salesmanFilter, toDate]);

  const selectedCustomer =
    ledgerCustomers.find((customer) => customer.key === selectedKey) ||
    ledgerCustomers[0] ||
    null;

  const selectedSaleItems = useMemo(() => {
    if (!selectedCustomer) return [];
    const saleIds = new Set(selectedCustomer.sales.map((sale) => sale.id));
    return saleItems.filter(
      (item) =>
        (item.sale_id && saleIds.has(item.sale_id)) ||
        (item.invoice_id && saleIds.has(item.invoice_id))
    );
  }, [saleItems, selectedCustomer]);

  const runningRows = useMemo(() => {
    if (!selectedCustomer) return [];

    const saleRows = selectedCustomer.sales.map((sale) => ({
      date: sale.invoice_date,
      description: `Invoice ${sale.invoice_no}`,
      debit: Number(sale.total_amount || 0),
      credit: getInvoiceReceivedAmount(sale),
    }));

    const paymentRows = selectedCustomer.payments.map((payment) => ({
      date: payment.payment_date,
      description: payment.remarks || `Payment ${payment.payment_mode || ""}`.trim(),
      debit: 0,
      credit: Number(payment.amount || 0),
    }));

    let balance = 0;
    return [...saleRows, ...paymentRows]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((row) => {
        balance += row.debit - row.credit;
        return { ...row, balance };
      });
  }, [selectedCustomer]);

  const paymentHistoryRows = useMemo(() => {
    if (!selectedCustomer) return [];

    const invoiceRows = selectedCustomer.sales
      .map((sale) => ({
        id: `sale-${sale.id}`,
        date: sale.invoice_date,
        invoiceNo: sale.invoice_no,
        mode: getPaymentLabel(sale.payment_mode),
        amount: getInvoiceReceivedAmount(sale),
        remarks: [
          isFinanceMode(sale.payment_mode)
            ? getFinanceDpRemarks(sale) ||
              `Settled through ${getPaymentLabel(sale.payment_mode)} bank payment`
            : "Invoice payment",
          `Salesman: ${formatSalesmanName(sale.salesman_name)}`,
        ].join(" | "),
      }))
      .filter((row) => row.amount > 0 || row.mode === "On Credit");

    const extraPaymentRows = selectedCustomer.payments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.payment_date,
      invoiceNo:
        payment.sale_id
          ? selectedCustomer.sales.find((sale) => sale.id === payment.sale_id)?.invoice_no || "-"
          : "-",
      mode: getPaymentLabel(payment.payment_mode),
      amount: Number(payment.amount || 0),
      remarks: payment.remarks || "Extra payment received",
    }));

    return [...invoiceRows, ...extraPaymentRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [selectedCustomer]);

  const exportLedgerExcel = () => {
    const rows = ledgerCustomers.map((customer) => ({
      CustomerName: customer.customer_name,
      MobileNumber: customer.customer_mobile,
      InvoiceNumbers: getInvoiceNumbers(customer.sales),
      Salesman: getSalesmanNames(customer.sales),
      TotalSales: customer.totalSales,
      TotalReceived: customer.totalReceived,
      OutstandingBalance: customer.outstandingBalance,
      LastTransactionDate: customer.lastTransactionDate,
    }));

    const invoiceRows = sales
      .filter((sale) => {
        const saleTime = getSaleDateValue(sale);
        const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
        const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
        if (from && saleTime < from) return false;
        if (to && saleTime > to) return false;
        if (salesmanFilter && (sale.salesman_name || "") !== salesmanFilter) return false;
        return true;
      })
      .map((sale) => ({
        InvoiceNo: sale.invoice_no,
        InvoiceDate: sale.invoice_date,
        CustomerName: sale.customer_name,
        Salesman: formatSalesmanName(sale.salesman_name),
        TotalAmount: Number(sale.total_amount || 0),
        PaymentMode: sale.payment_mode || "-",
      }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "SalesLedger");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(invoiceRows),
      "InvoiceSalesman"
    );

    if (selectedCustomer) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          runningRows.map((row) => {
            const invoiceNo = row.description.replace(/^Invoice\s*/, "");
            const sale = selectedCustomer.sales.find((entry) => entry.invoice_no === invoiceNo);
            return {
              Date: row.date,
              Description: row.description,
              InvoiceNumber: invoiceNo,
              Salesman: sale ? formatSalesmanName(sale.salesman_name) : "-",
              Debit: row.debit,
              Credit: row.credit,
              RunningBalance: row.balance,
            };
          })
        ),
        "LedgerDetail"
      );
    }

    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Sales_Ledger_${new Date().toISOString()}.xlsx`
    );
  };

  const exportLedgerPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(15);
    doc.text("Sales Ledger", 14, 14);

    autoTable(doc, {
      startY: 22,
      head: [["Customer", "Mobile", "Invoice No", "Salesman", "Total Sales", "Received", "Outstanding", "Last Date"]],
      body: ledgerCustomers.map((customer) => [
        customer.customer_name,
        customer.customer_mobile || "-",
        getInvoiceNumbers(customer.sales) || "-",
        getSalesmanNames(customer.sales),
        formatCurrency(customer.totalSales),
        formatCurrency(customer.totalReceived),
        formatCurrency(customer.outstandingBalance),
        formatDate(customer.lastTransactionDate),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    if (selectedCustomer) {
      doc.addPage();
      doc.text(`Ledger Detail: ${selectedCustomer.customer_name}`, 14, 14);
      autoTable(doc, {
        startY: 22,
        head: [["Date", "Invoice No", "Salesman", "Description", "Debit", "Credit", "Balance"]],
        body: runningRows.map((row) => {
          const invoiceNo = row.description.replace(/^Invoice\s*/, "");
          const sale = selectedCustomer.sales.find((entry) => entry.invoice_no === invoiceNo);
          return [
            formatDate(row.date),
            invoiceNo,
            sale ? formatSalesmanName(sale.salesman_name) : "-",
            row.description,
            formatCurrency(row.debit),
            formatCurrency(row.credit),
            formatCurrency(row.balance),
          ];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] },
      });
    }

    doc.save(`Sales_Ledger_${new Date().toISOString()}.pdf`);
  };

  if (loading) {
    return <p className="p-6 text-gray-500">Loading sales ledger...</p>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Ledger</h1>
          <p className="text-sm text-gray-500">
            Customer-wise sales, received amount, outstanding balance, and running ledger.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportLedgerExcel}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={exportLedgerPdf}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <input
          className="rounded-lg border bg-white p-2.5"
          placeholder="Search customer, mobile, salesman or invoice no..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="rounded-lg border bg-white p-2.5"
          value={salesmanFilter}
          onChange={(event) => setSalesmanFilter(event.target.value)}
        >
          <option value="">All Salesmen</option>
          {SALES_TEAM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded-lg border bg-white p-2.5"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
        />
        <input
          type="date"
          className="rounded-lg border bg-white p-2.5"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setFromDate("");
            setToDate("");
            setSearch("");
            setSalesmanFilter("");
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 hover:bg-gray-50"
        >
          Clear Filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-[980px] table-fixed text-sm text-gray-800">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="w-40 p-3 text-left">Invoice Number</th>
                <th className="w-44 p-3 text-left">Customer Name</th>
                <th className="w-32 p-3 text-left">Mobile Number</th>
                <th className="w-36 p-3 text-left">Salesman</th>
                <th className="w-32 p-3 text-right">Total Sales</th>
                <th className="w-32 p-3 text-right">Total Received</th>
                <th className="w-36 p-3 text-right">Outstanding Balance</th>
                <th className="w-36 p-3 text-left">Last Transaction Date</th>
              </tr>
            </thead>
            <tbody>
              {ledgerCustomers.map((customer) => (
                <tr
                  key={customer.key}
                  className={`cursor-pointer border-t hover:bg-gray-50 ${
                    selectedCustomer?.key === customer.key ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedKey(customer.key)}
                >
                  <td
                    className="p-3 text-xs font-medium"
                    title={getInvoiceNumbers(customer.sales) || "-"}
                  >
                    <span className="block truncate">{getInvoicePreview(customer.sales)}</span>
                  </td>
                  <td className="p-3 font-medium">{customer.customer_name}</td>
                  <td className="p-3">{customer.customer_mobile || "-"}</td>
                  <td className="p-3 text-xs" title={getSalesmanNames(customer.sales)}>
                    <span className="block truncate">{getSalesmanNames(customer.sales)}</span>
                  </td>
                  <td className="p-3 text-right">{formatCurrency(customer.totalSales)}</td>
                  <td className="p-3 text-right">{formatCurrency(customer.totalReceived)}</td>
                  <td className="p-3 text-right font-semibold">
                    {formatCurrency(customer.outstandingBalance)}
                  </td>
                  <td className="p-3">{formatDate(customer.lastTransactionDate)}</td>
                </tr>
              ))}
              {ledgerCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No ledger records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {selectedCustomer ? (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedCustomer.customer_name}
                </h2>
                <div className="mt-1 text-sm text-gray-500">
                  <div>Mobile: {selectedCustomer.customer_mobile || "-"}</div>
                  <div>Address: {selectedCustomer.customer_address || "-"}</div>
                  <div>GST: {selectedCustomer.customer_gst || "-"}</div>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-gray-500">Total Sales</div>
                  <div className="font-semibold">{formatCurrency(selectedCustomer.totalSales)}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-gray-500">Received</div>
                  <div className="font-semibold">{formatCurrency(selectedCustomer.totalReceived)}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-gray-500">Outstanding</div>
                  <div className="font-semibold">
                    {formatCurrency(selectedCustomer.outstandingBalance)}
                  </div>
                </div>
              </div>

              <h3 className="mb-2 font-semibold text-gray-900">Complete Sales History</h3>
              <div className="mb-5 max-h-64 overflow-y-auto rounded border">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Invoice</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Salesman</th>
                      <th className="p-2 text-left">Payment</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.sales.map((sale) => (
                      <tr key={sale.id} className="border-t align-top">
                        <td className="p-2">{sale.invoice_no}</td>
                        <td className="p-2">{formatDate(sale.invoice_date)}</td>
                        <td className="p-2 whitespace-nowrap">
                          {formatSalesmanName(sale.salesman_name)}
                        </td>
                        <td className="p-2 min-w-[180px]">
                          {isFinanceMode(sale.payment_mode) ? (
                            <FinanceDpDetails
                              source={sale}
                              formatAmount={(value) => `₹${formatCurrency(value)}`}
                              className="text-[11px] text-gray-600"
                            />
                          ) : (
                            getPaymentLabel(sale.payment_mode)
                          )}
                        </td>
                        <td className="p-2 text-right">{formatCurrency(Number(sale.total_amount || 0))}</td>
                        <td className="p-2 text-right">{formatCurrency(getInvoiceReceivedAmount(sale))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mb-2 font-semibold text-gray-900">Payment History</h3>
              <div className="mb-5 max-h-40 overflow-y-auto rounded border">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Invoice</th>
                      <th className="p-2 text-left">Mode</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistoryRows.map((payment) => (
                      <tr key={payment.id} className="border-t">
                        <td className="p-2">{formatDate(payment.date)}</td>
                        <td className="p-2">{payment.invoiceNo || "-"}</td>
                        <td className="p-2">{payment.mode}</td>
                        <td className="p-2 text-right">{formatCurrency(Number(payment.amount || 0))}</td>
                        <td className="p-2">{payment.remarks || "-"}</td>
                      </tr>
                    ))}
                    {paymentHistoryRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500">
                          No payment history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h3 className="mb-2 font-semibold text-gray-900">Running Balance</h3>
              <div className="max-h-52 overflow-y-auto rounded border">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-right">Debit</th>
                      <th className="p-2 text-right">Credit</th>
                      <th className="p-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningRows.map((row, index) => (
                      <tr key={`${row.date}-${index}`} className="border-t">
                        <td className="p-2">{formatDate(row.date)}</td>
                        <td className="p-2">{row.description}</td>
                        <td className="p-2 text-right">{formatCurrency(row.debit)}</td>
                        <td className="p-2 text-right">{formatCurrency(row.credit)}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedSaleItems.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  {selectedSaleItems.length} sale item records are linked to this customer.
                </p>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">Select a ledger row.</div>
          )}
        </div>
      </div>
    </div>
  );
}
