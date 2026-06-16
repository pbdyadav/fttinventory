import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import AdvancedFilterPanel from "@/components/AdvancedFilterPanel";
import FinanceDpDetails from "@/components/FinanceDpDetails";
import { SALES_TEAM_OPTIONS, formatSalesmanName } from "@/lib/salesTeam";

const PAYMENT_MODE_OPTIONS = [
  { label: "Cash", value: "cash" },
  { label: "Online", value: "online" },
  { label: "Partial (Cash + Online)", value: "partial" },
  { label: "Bajaj Card", value: "bajaj_card" },
  { label: "Credit Card", value: "credit_card" },
  { label: "On Credit", value: "on_credit" },
];

const isFinanceMode = (mode: string | null | undefined) => 
  mode === "finance_card" || mode === "bajaj_card" || mode === "credit_card";

type SaleRow = {
  id: number;
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  customer_gst: string | null;
  total_amount: number;
  payment_mode: string;
  cash_amount: number;
  online_amount: number;
  invoice_pdf_url?: string | null;
  invoice_file_path?: string | null;
  finance_dp_amount?: number | null;
  installment_count?: number | null;
  dp_payment_mode?: string | null;
  partial_dp_cash_amount?: number | null;
  partial_dp_online_amount?: number | null;
  payment_narration?: string | null;
  salesman_name?: string | null;
};

type SaleItemRow = {
  id: number;
  sale_id?: number | null;
  invoice_id?: number | null;
  laptop_id: number | null;
  item_type?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
  is_complimentary?: boolean | null;
  machine_code?: string | null;
  serial_no?: string | null;
  model?: string | null;
  cpu?: string | null;
  generation?: string | null;
  ram?: string | null;
  storage?: string | null;
  price?: number | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const isGiftItem = (item: SaleItemRow) =>
  item.item_type === "gift" || item.model?.startsWith("GIFT:");

export default function Sales() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busySaleId, setBusySaleId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    paymentMode: "",
    salesman: "",
  });
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItemRow[]>([]);

  const loadSales = async () => {
    setLoading(true);

    const [{ data: salesData, error: salesError }, { data: itemsData, error: itemsError }] =
      await Promise.all([
        supabase.from("sales").select("*").order("invoice_date", { ascending: false }),
        supabase.from("sales_items").select("*").order("sale_id", { ascending: false }),
      ]);

    if (salesError) console.error("Sales load error:", salesError);
    if (itemsError) console.error("Sales items load error:", itemsError);

    setSales((salesData || []) as SaleRow[]);
    setSaleItems((itemsData || []) as SaleItemRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadSales();
  }, []);

  const groupedSales = useMemo(() => {
    return sales.map((sale) => {
      const items = saleItems.filter(
        (item) => item.sale_id === sale.id || item.invoice_id === sale.id
      );
      const laptopItems = items.filter((item) => !isGiftItem(item));
      const giftItems = items.filter((item) => isGiftItem(item));

      return {
        ...sale,
        laptopItems,
        giftItems,
      };
    });
  }, [sales, saleItems]);

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groupedSales.filter((sale) => {
      const saleText = [
        sale.invoice_no,
        sale.customer_name,
        sale.customer_mobile,
        sale.customer_address,
        sale.salesman_name || "",
        ...sale.laptopItems.map((item) => item.serial_no || ""),
        ...sale.laptopItems.map((item) => item.machine_code || ""),
        ...sale.laptopItems.map((item) => item.model || ""),
        ...sale.giftItems.map(
          (item) => item.description || item.model?.replace(/^GIFT:\s*/, "") || ""
        ),
      ]
        .join(" ")
        .toLowerCase();

      if (term && !saleText.includes(term)) return false;

      const saleDate = sale.invoice_date ? new Date(`${sale.invoice_date}T00:00:00`) : null;
      const fromDate = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
      const toDate = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;
      const paymentMode = (sale.payment_mode || "").toLowerCase();

      if (fromDate && (!saleDate || saleDate < fromDate)) return false;
      if (toDate && (!saleDate || saleDate > toDate)) return false;
      if (filters.paymentMode) {
        if (filters.paymentMode === "bajaj_card") {
          if (paymentMode !== "bajaj_card" && paymentMode !== "finance_card") return false;
        } else if (filters.paymentMode === "credit_card") {
          if (paymentMode !== "credit_card" && paymentMode !== "finance_card") return false;
        } else if (paymentMode !== filters.paymentMode) {
          return false;
        }
      }

      if (filters.salesman && (sale.salesman_name || "") !== filters.salesman) {
        return false;
      }

      return true;
    });
  }, [groupedSales, search, filters]);

  const clearAdvancedFilters = () => {
    setFilters({ fromDate: "", toDate: "", paymentMode: "", salesman: "" });
  };

  const openInvoice = async (sale: SaleRow) => {
    const fallbackPath = sale.invoice_file_path || `invoices/${sale.invoice_no}.pdf`;
    const { data, error } = await supabase.storage
      .from("invoices")
      .createSignedUrl(fallbackPath, 60);

    if (error || !data?.signedUrl) {
      console.error("Invoice open error:", error);
      toast.error("Invoice file open nahi ho payi. Bucket path check kijiye.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const deleteSale = async (
    sale: SaleRow & { laptopItems: SaleItemRow[]; giftItems: SaleItemRow[] }
  ) => {
    const confirmed = window.confirm(
      `Delete invoice ${sale.invoice_no}? Isse sale record hat jayega aur related laptops wapas inventory me aa jayenge.`
    );

    if (!confirmed) return;

    setBusySaleId(sale.id);

    try {
      const laptopIds = sale.laptopItems
        .map((item) => item.laptop_id)
        .filter((value): value is number => Boolean(value));

      if (laptopIds.length) {
        const { error: laptopError } = await supabase
          .from("laptop_tests")
          .update({ status: "In Stock" })
          .in("id", laptopIds);

        if (laptopError) throw laptopError;
      }

      const { data: linkedTransfers, error: linkedTransfersError } = await supabase
        .from("transfers")
        .select("id")
        .eq("sale_invoice_id", sale.id);

      if (linkedTransfersError) throw linkedTransfersError;

      const transferIds = (linkedTransfers || []).map((row: any) => row.id);

      if (transferIds.length > 0) {
        const { error: transferDeleteError } = await supabase
          .from("transfers")
          .delete()
          .in("id", transferIds);

        if (transferDeleteError) {
          const { error: transferUnlinkError } = await supabase
            .from("transfers")
            .update({ sale_invoice_id: null })
            .in("id", transferIds);

          if (transferUnlinkError) throw transferUnlinkError;
        }
      }

      const { error: transferUnlinkError } = await supabase
        .from("transfers")
        .update({ sale_invoice_id: null })
        .eq("sale_invoice_id", sale.id);

      if (transferUnlinkError) {
        console.warn("Transfer unlink warning:", transferUnlinkError.message);
      }

      const { error: transferError } = await supabase
        .from("transfers")
        .delete()
        .ilike("remarks", `%${sale.invoice_no}%`);

      if (transferError) {
        console.warn("Transfer delete warning:", transferError.message);
      }

      const { data: stillLinkedTransfers, error: stillLinkedTransfersError } = await supabase
        .from("transfers")
        .select("id")
        .eq("sale_invoice_id", sale.id);

      if (stillLinkedTransfersError) throw stillLinkedTransfersError;
      if ((stillLinkedTransfers || []).length > 0) {
        throw new Error("linked transfer records still exist for this sale");
      }

      const fallbackPath = sale.invoice_file_path || `invoices/${sale.invoice_no}.pdf`;
      const { error: storageError } = await supabase.storage
        .from("invoices")
        .remove([fallbackPath]);

      if (storageError) {
        console.warn("Storage delete warning:", storageError.message);
      }

      const { error: saleItemsDeleteError } = await supabase
        .from("sales_items")
        .delete()
        .or(`sale_id.eq.${sale.id},invoice_id.eq.${sale.id}`);

      if (saleItemsDeleteError) throw saleItemsDeleteError;

      const { error: saleDeleteError } = await supabase
        .from("sales")
        .delete()
        .eq("id", sale.id);

      if (saleDeleteError) throw saleDeleteError;

      toast.success("Sale invoice delete ho gayi.");
      await loadSales();
    } catch (error: any) {
      console.error("Delete sale error:", error);
      toast.error(`Sale delete nahi ho payi: ${error?.message || "Unknown error"}`);
    } finally {
      setBusySaleId(null);
    }
  };

  if (loading) {
    return <p className="p-6 text-gray-500">Loading sales...</p>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Register</h1>
          <p className="text-sm text-gray-500">
            Here, you will find sold laptops, customer details, and invoice totals all in one place.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <input
          type="text"
          className="w-full rounded-lg border bg-white p-2.5"
          placeholder="Search by invoice no, customer, salesman, machine code, serial no or gift..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowAdvancedFilter(true)}
          className="whitespace-nowrap rounded-lg bg-slate-800 px-4 py-2.5 text-white hover:bg-slate-900"
        >
          Advanced Filter
        </button>
      </div>

      {showAdvancedFilter && (
        <AdvancedFilterPanel
          title="Sales Advanced Filter"
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          selectLabel="Payment Mode"
          selectValue={filters.paymentMode}
          selectOptions={PAYMENT_MODE_OPTIONS}
          onFromDateChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
          onToDateChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
          onSelectChange={(value) => setFilters((current) => ({ ...current, paymentMode: value }))}
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

      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Invoice</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Salesman</th>
              <th className="p-3 text-left">Sold Laptops</th>
              <th className="p-3 text-left">Gift Items</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="border-t align-top hover:bg-gray-50">
                <td className="p-3 font-semibold">{sale.invoice_no}</td>
                <td className="p-3 whitespace-nowrap">{formatDate(sale.invoice_date)}</td>
                <td className="p-3 min-w-[220px]">
                  <div className="font-medium">{sale.customer_name || "-"}</div>
                  <div className="text-xs text-gray-500">{sale.customer_mobile || "-"}</div>
                  <div className="text-xs text-gray-500">{sale.customer_address || "-"}</div>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {formatSalesmanName(sale.salesman_name)}
                </td>
                <td className="p-3 min-w-[260px]">
                  {sale.laptopItems.length ? (
                    <div className="space-y-2">
                      {sale.laptopItems.map((item) => (
                        <div key={item.id} className="text-xs leading-5">
                          <div className="font-medium">
                            {item.model || "Laptop"} {item.price ? `• ${formatCurrency(Number(item.price || 0))}` : ""}
                          </div>
                          <div className="text-gray-500">
                            M/C: {item.machine_code || "-"} | S/N: {item.serial_no || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="p-3 min-w-[200px]">
                  {sale.giftItems.length ? (
                    <div className="space-y-2">
                      {sale.giftItems.map((item) => (
                        <div key={item.id} className="text-xs leading-5">
                          <div className="font-medium">
                            {item.description || item.model?.replace(/^GIFT:\s*/, "") || "Gift Item"}
                          </div>
                          <div className="text-gray-500">
                            Qty: {item.quantity || 1} |{" "}
                            {item.is_complimentary
                              ? "Complimentary"
                              : formatCurrency(
                                  Number(item.line_total ?? item.price ?? 0)
                                )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">No gift</span>
                  )}
                </td>
                <td className="p-3 min-w-[200px]">
                  {isFinanceMode(sale.payment_mode) ? (
                    <FinanceDpDetails
                      source={sale}
                      formatAmount={formatCurrency}
                      className="text-xs text-gray-600"
                    />
                  ) : (
                    <>
                      <div>{sale.payment_mode || "-"}</div>
                      <div className="text-xs text-gray-500">
                        Cash: {formatCurrency(Number(sale.cash_amount || 0))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Online: {formatCurrency(Number(sale.online_amount || 0))}
                      </div>
                    </>
                  )}
                </td>
                <td className="p-3 text-right font-semibold whitespace-nowrap">
                  {formatCurrency(Number(sale.total_amount || 0))}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => openInvoice(sale)}
                      className="text-blue-600 hover:underline"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/sales/edit/${sale.id}`)}
                      className="text-amber-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSale(sale)}
                      disabled={busySaleId === sale.id}
                      className="text-red-600 hover:underline disabled:text-gray-400"
                    >
                      {busySaleId === sale.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  No sales found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
