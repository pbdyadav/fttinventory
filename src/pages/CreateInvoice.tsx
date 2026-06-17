import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import CompanyLogo from "@/assets/logo.png";
import FinanceDpDetails from "@/components/FinanceDpDetails";
import { SALES_TEAM, formatSalesmanName } from "@/lib/salesTeam";
import {
  buildFinanceDpSaveFields,
  financeDpSourceFromForm,
  getFinanceDpBreakdown,
  getFinancePaymentDisplay,
  isMissingExtendedSalesColumnError,
  stripExtendedSalesFields,
  type FinanceDpMode,
} from "@/lib/financeDp";

type CustomerDetails = {
  name: string;
  mobile: string;
  address: string;
  gst: string;
};

type InvoiceItem = {
  id: string;
  itemType: "laptop" | "gift";
  laptopId: number | null;
  machineCode: string;
  serialNo: string;
  model: string;
  cpu: string;
  generation: string;
  ram: string;
  storage: string;
  graphicCard: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isComplimentary: boolean;
  sourceLocation: string;
};

type LocationState = {
  currentLocation?: string;
};

type PaymentMode =
  | "cash"
  | "online"
  | "partial"
  | "bajaj_card"
  | "credit_card"
  | "finance_card"
  | "on_credit";

const isBajajMode = (mode: PaymentMode | string | null | undefined) =>
  mode === "finance_card" || mode === "bajaj_card";

const isCreditCardMode = (mode: PaymentMode | string | null | undefined) =>
  mode === "credit_card";

const STORAGE_BUCKET = "invoices";

const COMPANY = {
  name: "FURTHERANCE TECHNOTREE PRIVATE LIMITED",
  addressLine1: "402-C, Block, Silver Mall",
  addressLine2: "8 A RNT MARG, INDORE - 452001",
  gst: "GSTIN/UIN: 23AACCF9503E1Z1",
  state: "Madhya Pradesh (23)",
  phone: "Mob.: 9893532947",
  email: "Email: fttpvtltd@gmail.com",
};

let cachedCompressedLogo: Promise<string | null> | null = null;

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyLaptopItem = (): InvoiceItem => ({
  id: createId(),
  itemType: "laptop",
  laptopId: null,
  machineCode: "",
  serialNo: "",
  model: "",
  cpu: "",
  generation: "",
  ram: "",
  storage: "",
  graphicCard: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  isComplimentary: false,
  sourceLocation: "Main Warehouse",
});

const createGiftItem = (): InvoiceItem => ({
  id: createId(),
  itemType: "gift",
  laptopId: null,
  machineCode: "",
  serialNo: "",
  model: "",
  cpu: "",
  generation: "",
  ram: "",
  storage: "",
  graphicCard: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  isComplimentary: true,
  sourceLocation: "",
});

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const getLineTotal = (item: InvoiceItem) =>
  item.itemType === "gift" && item.isComplimentary
    ? 0
    : Number(item.quantity || 0) * Number(item.unitPrice || 0);

const getLaptopDescription = (item: InvoiceItem) =>
  [
    item.model,
    item.cpu,
    item.generation ? `${item.generation} Gen` : "",
    item.ram ? `RAM ${item.ram}` : "",
    item.storage,
    item.graphicCard,
  ]
    .filter(Boolean)
    .join(" | ");

const getDisplayDescription = (item: InvoiceItem) =>
  item.itemType === "gift"
    ? item.description || "Gift Item"
    : getLaptopDescription(item) || item.model || "Laptop";

const getInvoiceItemDetails = (item: InvoiceItem) => {
  if (item.itemType === "gift") {
    return item.isComplimentary
      ? `Gift\n${getDisplayDescription(item)}`
      : getDisplayDescription(item);
  }

  return `Laptop\n${getLaptopDescription(item) || item.model || "-"}\nM/C: ${item.machineCode || "-"}\nS/N: ${item.serialNo || "-"}`;
};

const getPaymentLabel = (mode: PaymentMode) => {
  if (mode === "cash") return "Cash";
  if (mode === "online") return "Online";
  if (mode === "partial") return "Partial";
  if (mode === "bajaj_card") return "Bajaj Card";
  if (mode === "credit_card") return "Credit Card";
  if (mode === "finance_card") return "Bajaj Finance / Credit Card";
  return "On Credit";
};

const getDpPaymentLabel = (mode: FinanceDpMode) =>
  mode === "partial_cash_online"
    ? "Cash + Online"
    : mode === "online"
      ? "Online"
      : "Cash";

const getInvoiceBoxPaymentLabel = (
  mode: PaymentMode,
  dpPaymentMode: FinanceDpMode
) => {
  if (isBajajMode(mode)) {
    const label = mode === "bajaj_card" ? "Bajaj Card" : "Bajaj Finance / Card";
    return `${label} (${getDpPaymentLabel(dpPaymentMode)} DP)`;
  }
  if (isCreditCardMode(mode)) {
    return "Credit Card";
  }

  return getPaymentLabel(mode);
};

const getReadableCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getDpPaymentLabelLegacy = (mode: "cash" | "online") =>
  mode === "online" ? "Online" : "Cash";

const normalizePositiveNumber = (value: string | number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const loadCompressedLogo = async () => {
  if (!cachedCompressedLogo) {
    cachedCompressedLogo = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 180;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");

        if (!context) {
          resolve(null);
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.42));
      };
      image.onerror = () => resolve(null);
      image.src = CompanyLogo;
    });
  }

  return cachedCompressedLogo;
};

const getFallbackLaptopId = (items: InvoiceItem[]) =>
  items.find((item) => item.itemType === "laptop" && item.laptopId)?.laptopId ?? null;

const getCompatibleTransferType = (sourceLocation: string) => {
  const normalized = sourceLocation.toLowerCase();
  if (normalized.includes("retail")) return "retail";
  if (normalized.includes("godown")) return "godown";
  return "warehouse";
};

export default function CreateInvoice() {
  const { id, saleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state || {}) as LocationState;
  const isEditMode = Boolean(saleId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceNoPreview, setInvoiceNoPreview] = useState("Generating...");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    mobile: "",
    address: "",
    gst: "",
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [financeDpAmount, setFinanceDpAmount] = useState(0);
  const [partialDpCashAmount, setPartialDpCashAmount] = useState(0);
  const [partialDpOnlineAmount, setPartialDpOnlineAmount] = useState(0);
  const [installmentCount, setInstallmentCount] = useState(0);
  const [dpPaymentMode, setDpPaymentMode] = useState<FinanceDpMode>("cash");
  const [paymentNarration, setPaymentNarration] = useState("");
  const [bankName, setBankName] = useState("");
  const [emiAmount, setEmiAmount] = useState<number | "">("");
  const [salesmanName, setSalesmanName] = useState("");

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + getLineTotal(item), 0),
    [items]
  );

  const total = subtotal;

  const financeDpSource = useMemo(
    () =>
      financeDpSourceFromForm({
        paymentMode,
        total,
        dpPaymentMode,
        financeDpAmount,
        partialDpCashAmount,
        partialDpOnlineAmount,
        installmentCount,
        paymentNarration,
      }),
    [
      paymentMode,
      total,
      dpPaymentMode,
      financeDpAmount,
      partialDpCashAmount,
      partialDpOnlineAmount,
      installmentCount,
      paymentNarration,
    ]
  );

  const financeDpBreakdown = useMemo(
    () => getFinanceDpBreakdown(financeDpSource),
    [financeDpSource]
  );

  const financeDpTotal =
    dpPaymentMode === "partial_cash_online"
      ? partialDpCashAmount + partialDpOnlineAmount
      : financeDpAmount;

  useEffect(() => {
    if (paymentMode === "cash") {
      setCashAmount(total);
      setOnlineAmount(0);
      return;
    }

    if (paymentMode === "online") {
      setOnlineAmount(total);
      setCashAmount(0);
      return;
    }

    if (isBajajMode(paymentMode)) {
      setCashAmount(financeDpBreakdown.cashAmount);
      setOnlineAmount(financeDpBreakdown.onlineAmount);
    }
  }, [paymentMode, financeDpBreakdown]);

  const generateInvoiceNo = async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from("sales")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .single();

      const lastId = data?.id ?? 0;
      return `INV-${String(Number(lastId) + 1).padStart(5, "0")}`;
    } catch (error) {
      console.warn("Invoice no generation fallback:", error);
      return `INV-${Date.now().toString().slice(-6)}`;
    }
  };

  const loadLaptopByMachineCode = async (
    itemId: string,
    machineCode: string,
    allowSold = false
  ) => {
    const trimmedCode = machineCode.trim();
    if (!trimmedCode) return;

    const { data, error } = await supabase
      .from("laptop_tests")
      .select("id, MashinCode, SerialNo, Model, CPU, Gen, RAM, SSDHdd, GraphicCard, status")
      .eq("MashinCode", Number(trimmedCode))
      .maybeSingle();

    if (error) {
      toast.error("Unable to fetch laptop by machine code.");
      return;
    }

    if (!data) {
      toast.error("No laptop found for this machine code.");
      return;
    }

    if (!allowSold && data.status === "sold") {
      toast.error("This laptop is already marked as sold.");
      return;
    }

    let sourceLocation = "Main Warehouse";
    const { data: latestTransfer } = await supabase
      .from("transfers")
      .select("to_location")
      .eq("laptop_id", data.id)
      .order("transfer_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    sourceLocation = latestTransfer?.to_location || "Main Warehouse";

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
            ...item,
            laptopId: data.id,
            machineCode: String(data.MashinCode ?? ""),
            serialNo: data.SerialNo ?? "",
            model: data.Model ?? "",
            cpu: data.CPU ?? "",
            generation: data.Gen ?? "",
            ram: data.RAM ?? "",
            storage: data.SSDHdd ?? "",
            graphicCard: data.GraphicCard ?? "",
            sourceLocation,
          }
          : item
      )
    );
  };

  useEffect(() => {
    const loadInvoiceContext = async () => {
      setLoading(true);
      setInvoiceNoPreview(await generateInvoiceNo());

      if (saleId) {
        const { data: saleData, error: saleError } = await supabase
          .from("sales")
          .select("*")
          .eq("id", Number(saleId))
          .single();

        if (saleError || !saleData) {
          toast.error("Failed to load sale invoice.");
          setLoading(false);
          return;
        }

        const { data: saleItemsData } = await supabase
          .from("sales_items")
          .select("*")
          .or(`sale_id.eq.${saleId},invoice_id.eq.${saleId}`)
          .order("id", { ascending: true });

        setInvoiceNoPreview(saleData.invoice_no || "");
        setInvoiceDate(saleData.invoice_date || new Date().toISOString().slice(0, 10));
        setCustomer({
          name: saleData.customer_name || "",
          mobile: saleData.customer_mobile || "",
          address: saleData.customer_address || "",
          gst: saleData.customer_gst || "",
        });

        const editPaymentMode = (saleData.payment_mode || "cash") as PaymentMode;
        setPaymentMode(editPaymentMode);
        setCashAmount(Number(saleData.cash_amount || 0));
        setOnlineAmount(Number(saleData.online_amount || 0));
        const loadedBreakdown = getFinanceDpBreakdown({
          payment_mode: editPaymentMode,
          finance_dp_amount: saleData.finance_dp_amount,
          dp_payment_mode: saleData.dp_payment_mode,
          partial_dp_cash_amount: saleData.partial_dp_cash_amount,
          partial_dp_online_amount: saleData.partial_dp_online_amount,
        });
        setDpPaymentMode(loadedBreakdown.mode);
        setFinanceDpAmount(Number(saleData.finance_dp_amount || 0));
        setPartialDpCashAmount(loadedBreakdown.cashAmount);
        setPartialDpOnlineAmount(loadedBreakdown.onlineAmount);

        setBankName(saleData.bank_name || "");
        setEmiAmount(saleData.emi_amount || "");
        setInstallmentCount(Number(saleData.installment_count || 0));
        setPaymentNarration(saleData.payment_narration || "");
        setSalesmanName(saleData.salesman_name || "");

        const hydratedItems =
          (saleItemsData || []).map((item: any) => ({
            id: createId(),
            itemType:
              item.item_type === "gift" ||
                String(item.model || "").startsWith("GIFT:")
                ? "gift"
                : "laptop",
            laptopId: item.laptop_id ?? null,
            machineCode: item.machine_code || "",
            serialNo: item.serial_no || "",
            model:
              item.item_type === "gift"
                ? ""
                : item.model || "",
            cpu: item.cpu || "",
            generation: item.generation || "",
            ram: item.ram || "",
            storage: item.storage || "",
            graphicCard: item.graphic_card || "",
            description:
              item.description ||
              String(item.model || "").replace(/^GIFT:\s*/, "") ||
              "",
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unit_price ?? item.price ?? item.amount ?? 0),
            isComplimentary: Boolean(
              item.is_complimentary ?? item.is_compliment ?? false
            ),
            sourceLocation: "Main Warehouse",
          })) || [];

        setItems(hydratedItems.length ? hydratedItems : [createEmptyLaptopItem()]);
        setLoading(false);
        return;
      }

      if (!id) {
        setItems([createEmptyLaptopItem()]);
        setLoading(false);
        return;
      }

      const laptopId = Number(id);
      const { data, error } = await supabase
        .from("laptop_tests")
        .select("id, MashinCode, SerialNo, Model, CPU, Gen, RAM, SSDHdd, GraphicCard, status")
        .eq("id", laptopId)
        .single();

      if (error || !data) {
        toast.error("Failed to load laptop details.");
        setItems([createEmptyLaptopItem()]);
        setLoading(false);
        return;
      }

      let sourceLocation = locationState.currentLocation || "Main Warehouse";
      if (!locationState.currentLocation) {
        const { data: latestTransfer } = await supabase
          .from("transfers")
          .select("to_location")
          .eq("laptop_id", laptopId)
          .order("transfer_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        sourceLocation = latestTransfer?.to_location || "Main Warehouse";
      }

      setItems([
        {
          id: createId(),
          itemType: "laptop",
          laptopId: data.id,
          machineCode: String(data.MashinCode ?? ""),
          serialNo: data.SerialNo ?? "",
          model: data.Model ?? "",
          cpu: data.CPU ?? "",
          generation: data.Gen ?? "",
          ram: data.RAM ?? "",
          storage: data.SSDHdd ?? "",
          graphicCard: data.GraphicCard ?? "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          isComplimentary: false,
          sourceLocation,
        },
      ]);
      setLoading(false);
    };

    loadInvoiceContext();
  }, [id, saleId, locationState.currentLocation]);

  const updateItem = (
    itemId: string,
    field: keyof InvoiceItem,
    value: string | number | boolean | null
  ) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        const updated = {
          ...item,
          [field]:
            field === "quantity" || field === "unitPrice"
              ? normalizePositiveNumber(value as string | number)
              : value,
        } as InvoiceItem;

        if (field === "isComplimentary" && Boolean(value)) {
          updated.unitPrice = 0;
        }

        return updated;
      })
    );
  };

  const addLaptopItem = () =>
    setItems((current) => [...current, createEmptyLaptopItem()]);

  const addGiftItem = () =>
    setItems((current) => [...current, createGiftItem()]);

  const removeItem = (itemId: string) =>
    setItems((current) => current.filter((item) => item.id !== itemId));

  const generatePdfBlob = async (
    invoiceNo: string,
    itemsList: InvoiceItem[],
    customerData: CustomerDetails
  ): Promise<Blob> => {
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
      compress: true,
      putOnlyUsedFonts: true,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 36;
    const right = pageWidth - 36;
    const bottomMargin = 42;
    let y = 34;

    try {
      const compressedLogo = await loadCompressedLogo();
      if (compressedLogo) {
        doc.addImage(compressedLogo, "JPEG", left, y + 2, 38, 38, undefined, "MEDIUM");
      }
    } catch {
      console.warn("Unable to attach logo to invoice PDF.");
    }

    const companyNameX = left + 58;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(COMPANY.name, companyNameX, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const companyInfoTop = y + 30;
    doc.text(COMPANY.addressLine1, companyNameX, companyInfoTop);
    doc.text(COMPANY.addressLine2, companyNameX, companyInfoTop + 12);
    doc.text(COMPANY.gst, companyNameX, companyInfoTop + 24);
    doc.text(`${COMPANY.state}   ${COMPANY.phone}`, companyNameX, companyInfoTop + 36);
    doc.text(COMPANY.email, companyNameX, companyInfoTop + 48);

    const financeDisplay = getFinancePaymentDisplay(financeDpSource);
    const paymentText = financeDisplay
      ? `Payment: ${financeDisplay.paymentModeLabel}`
      : `Payment: ${getPaymentLabel(paymentMode)}`;

    const invoiceBoxWidth = 200;
    const invoiceBoxX = right - invoiceBoxWidth;
    const invoiceBoxTop = y + 2;
    const invoiceTextX = invoiceBoxX + 12;
    const invoiceTextMaxWidth = invoiceBoxWidth - 24;
    const invoiceLineHeight =
      (doc.getFontSize() * doc.getLineHeightFactor() * 1.08) / doc.internal.scaleFactor;
    const invoiceFieldGap = 4;
    const invoiceBoxPaddingTop = 12;
    const invoiceBoxPaddingBottom = 12;
    const invoiceTitleHeight = 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const invoiceFieldBlocks = [
      doc.splitTextToSize(`Invoice No: ${invoiceNo}`, invoiceTextMaxWidth),
      doc.splitTextToSize(`Invoice Date: ${formatDate(invoiceDate)}`, invoiceTextMaxWidth),
      doc.splitTextToSize(paymentText, invoiceTextMaxWidth),
      doc.splitTextToSize(
        `Salesman: ${formatSalesmanName(salesmanName)}`,
        invoiceTextMaxWidth
      ),
    ];

    const invoiceFieldsHeight = invoiceFieldBlocks.reduce(
      (sum, block) => sum + block.length * invoiceLineHeight + invoiceFieldGap,
      -invoiceFieldGap
    );
    const invoiceBoxHeight =
      invoiceBoxPaddingTop +
      invoiceTitleHeight +
      invoiceFieldsHeight +
      invoiceBoxPaddingBottom;

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(1.1);
    doc.roundedRect(
      invoiceBoxX,
      invoiceBoxTop,
      invoiceBoxWidth,
      invoiceBoxHeight,
      8,
      8
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(
      "SALE INVOICE",
      invoiceBoxX + invoiceBoxWidth / 2,
      invoiceBoxTop + invoiceBoxPaddingTop + 6,
      { align: "center" }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    let invoiceFieldY =
      invoiceBoxTop + invoiceBoxPaddingTop + invoiceTitleHeight + 6;

    invoiceFieldBlocks.forEach((block) => {
      block.forEach((line) => {
        doc.text(line, invoiceTextX, invoiceFieldY);
        invoiceFieldY += invoiceLineHeight;
      });
      invoiceFieldY += invoiceFieldGap;
    });

    const companyBlockBottom = companyInfoTop + 48 + 10;
    y = Math.max(invoiceBoxTop + invoiceBoxHeight, companyBlockBottom) + 16;

    const addressLines = doc.splitTextToSize(
      `Address: ${customerData.address || "-"}`,
      320
    );
    const financePdfLines =
      isBajajMode(paymentMode) && financeDisplay
        ? financeDisplay.isPartialBreakup
          ? 5 +
            (financeDisplay.narration
              ? doc.splitTextToSize(`Narration: ${financeDisplay.narration}`, 170)
                  .length
              : 0)
          : 3 +
            (financeDisplay.narration
              ? doc.splitTextToSize(`Narration: ${financeDisplay.narration}`, 170)
                  .length
              : 0)
        : 0;
    const nonFinancePdfLines = paymentNarration
      ? doc.splitTextToSize(`Narration: ${paymentNarration}`, 170).length
      : 0;
    const paymentSummaryHeight =
      isBajajMode(paymentMode) ? 70 + financePdfLines * 14 : isCreditCardMode(paymentMode) ? 120 + nonFinancePdfLines * 12 : 88 + nonFinancePdfLines * 12;
    const customerBoxHeight = Math.max(
      paymentSummaryHeight,
      32 + addressLines.length * 12 + 20
    );

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(left, y, pageWidth - left * 2, customerBoxHeight, 8, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Bill To", left + 12, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    doc.text(customerData.name || "-", left + 12, y + 34);
    doc.text(`Mobile: ${customerData.mobile || "-"}`, left + 12, y + 49);
    doc.text(addressLines, left + 12, y + 66);
    const gstY = y + 66 + addressLines.length * 11 + 6;
    doc.text(`GST No: ${customerData.gst || "-"}`, left + 12, gstY);

    const paymentBoxX = pageWidth - 205;
    doc.setFont("helvetica", "bold");
    doc.text("Payment Summary", paymentBoxX, y + 18);
    doc.setFont("helvetica", "normal");
    let paymentLineY = y + 38;
    if (isBajajMode(paymentMode) && financeDisplay) {
      if (financeDisplay.isPartialBreakup) {
        doc.text("DP Details:", paymentBoxX, paymentLineY);
        paymentLineY += 14;
        doc.text(
          `Cash: ${formatCurrency(financeDisplay.cashAmount)}`,
          paymentBoxX,
          paymentLineY
        );
        paymentLineY += 14;
        doc.text(
          `Online: ${formatCurrency(financeDisplay.onlineAmount)}`,
          paymentBoxX,
          paymentLineY
        );
        paymentLineY += 14;
        doc.text(
          `Total DP: ${formatCurrency(financeDisplay.totalDp)}`,
          paymentBoxX,
          paymentLineY
        );
        paymentLineY += 14;
      } else {
        doc.text(
          `DP (${financeDisplay.legacyDpLabel}): ${formatCurrency(financeDisplay.totalDp)}`,
          paymentBoxX,
          paymentLineY
        );
        paymentLineY += 14;
      }
      doc.text(
        `Financed Amount: ${formatCurrency(financeDisplay.financedAmount)}`,
        paymentBoxX,
        paymentLineY
      );
      paymentLineY += 14;
      doc.text(`EMI Count: ${installmentCount || 0}`, paymentBoxX, paymentLineY);
      paymentLineY += 14;
      if (financeDisplay.narration) {
        const narrationLines = doc.splitTextToSize(
          `Narration: ${financeDisplay.narration}`,
          170
        );
        doc.text(narrationLines, paymentBoxX, paymentLineY);
        paymentLineY += narrationLines.length * 12;
      }
      doc.text(`Grand Total: ${formatCurrency(total)}`, paymentBoxX, paymentLineY);
    } else if (isCreditCardMode(paymentMode)) {
      doc.text(`Bank: ${bankName || "-"}`, paymentBoxX, paymentLineY);
      paymentLineY += 16;
      doc.text(`EMI Months: ${installmentCount || 0}`, paymentBoxX, paymentLineY);
      paymentLineY += 16;
      doc.text(`EMI Amount: ${formatCurrency(Number(emiAmount || 0))}`, paymentBoxX, paymentLineY);
      paymentLineY += 16;
      if (Number(cashAmount) > 0 || Number(onlineAmount) > 0) {
        doc.text(`Customer Contribution:`, paymentBoxX, paymentLineY);
        paymentLineY += 16;
        if (Number(cashAmount) > 0) {
          doc.text(`  Cash: ${formatCurrency(Number(cashAmount))}`, paymentBoxX, paymentLineY);
          paymentLineY += 16;
        }
        if (Number(onlineAmount) > 0) {
          doc.text(`  Online: ${formatCurrency(Number(onlineAmount))}`, paymentBoxX, paymentLineY);
          paymentLineY += 16;
        }
      }
      if (paymentNarration) {
        const narrationLines = doc.splitTextToSize(
          `Narration: ${paymentNarration}`,
          170
        );
        doc.text(narrationLines, paymentBoxX, paymentLineY);
        paymentLineY += narrationLines.length * 12;
      }
      doc.text(`Grand Total: ${formatCurrency(total)}`, paymentBoxX, paymentLineY);
    } else {
      doc.text(`Cash: ${formatCurrency(cashAmount)}`, paymentBoxX, paymentLineY);
      paymentLineY += 16;
      doc.text(`Online: ${formatCurrency(onlineAmount)}`, paymentBoxX, paymentLineY);
      paymentLineY += 16;
      if (paymentNarration) {
        const narrationLines = doc.splitTextToSize(
          `Narration: ${paymentNarration}`,
          170
        );
        doc.text(narrationLines, paymentBoxX, paymentLineY);
        paymentLineY += narrationLines.length * 12;
      }
      doc.text(`Grand Total: ${formatCurrency(total)}`, paymentBoxX, paymentLineY);
    }

    y += customerBoxHeight + 18;

    const rows = itemsList.map((item, index) => [
      String(index + 1),
      getInvoiceItemDetails(item),
      String(item.quantity || 1),
      formatCurrency(item.itemType === "gift" && item.isComplimentary ? 0 : item.unitPrice || 0),
      formatCurrency(getLineTotal(item)),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Item Details", "Qty", "Rate", "Amount"]],
      body: rows,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 5,
        lineColor: [203, 213, 225],
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
      },
      margin: { left, right: left, bottom: bottomMargin },
      columnStyles: {
        0: { cellWidth: 26, halign: "center" },
        1: { cellWidth: 295 },
        2: { cellWidth: 42, halign: "center" },
        3: { cellWidth: 74, halign: "right" },
        4: { cellWidth: 86, halign: "right" },
      },
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(`Subtotal: ${formatCurrency(subtotal)}`, right, tableEndY + 24, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text(`Grand Total: ${formatCurrency(total)}`, right, tableEndY + 44, {
      align: "right",
    });

    const terms = [
      "1. One month guarantee and Two month warranty (excluding physical, liquid, or burn damage).",
      "2. One year free service from invoice date. Spare parts, if needed, are chargeable.",
      "3. Complimentary gift items, if any, are non-returnable and only for this invoice.",
      "4. Goods once sold will be serviced as per warranty terms mentioned above.",
      "5. Warranty will be covered only if the warranty seal is intact and the product condition remains the same as at the time of purchase.",
    ];
    const termLines = terms.flatMap((line) =>
      doc.splitTextToSize(line, pageWidth - left * 2 - 24)
    );
    const termsBoxHeight = Math.max(98, 32 + termLines.length * 12 + 14);
    const requiredHeightAfterTable = 58 + termsBoxHeight + 72;
    let termsY = tableEndY + 66;

    if (termsY + requiredHeightAfterTable > pageHeight - bottomMargin) {
      doc.addPage();
      termsY = 52;
    }

    doc.roundedRect(left, termsY, pageWidth - left * 2, termsBoxHeight, 8, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Warranty / Terms", left + 12, termsY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let termY = termsY + 38;
    terms.forEach((line) => {
      const split = doc.splitTextToSize(line, pageWidth - left * 2 - 24);
      doc.text(split, left + 12, termY);
      termY += split.length * 12 + 2;
    });

    const signatureY = termsY + termsBoxHeight + 34;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("For FURTHERANCE TECHNOTREE PVT. LTD.", right - 210, signatureY);
    doc.line(right - 210, signatureY + 36, right, signatureY + 36);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", right - 210, signatureY + 52);

    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text(
      "This is a computer generated invoice.",
      left,
      signatureY + 52
    );

    return doc.output("blob");
  };

  const buildExtendedSalesItemPayload = (
    saleId: number,
    item: InvoiceItem,
    fallbackLaptopId: number | null
  ) => ({
    sale_id: saleId,
    invoice_id: saleId,
    laptop_id:
      item.itemType === "laptop" ? item.laptopId : fallbackLaptopId,
    item_type: item.itemType,
    description: getDisplayDescription(item),
    quantity: item.quantity || 1,
    unit_price: item.itemType === "gift" && item.isComplimentary ? 0 : item.unitPrice || 0,
    line_total: getLineTotal(item),
    is_complimentary: item.itemType === "gift" ? item.isComplimentary : false,
    is_compliment: item.itemType === "gift" ? item.isComplimentary : false,
    machine_code: item.itemType === "gift" ? "" : item.machineCode || "",
    serial_no: item.itemType === "gift" ? "" : item.serialNo || "",
    model: item.itemType === "gift" ? item.description || "Gift Item" : item.model || "",
    cpu: item.itemType === "gift" ? "" : item.cpu || "",
    generation: item.itemType === "gift" ? "" : item.generation || "",
    ram: item.itemType === "gift" ? "" : item.ram || "",
    storage: item.itemType === "gift" ? "" : item.storage || "",
    graphic_card: item.itemType === "gift" ? "" : item.graphicCard || "",
    price: getLineTotal(item),
    amount: getLineTotal(item),
  });

  const buildLegacySalesItemPayload = (
    saleId: number,
    item: InvoiceItem,
    fallbackLaptopId: number | null
  ) => ({
    sale_id: saleId,
    invoice_id: saleId,
    laptop_id:
      item.itemType === "laptop" ? item.laptopId : fallbackLaptopId,
    machine_code: item.itemType === "gift" ? "" : item.machineCode || "",
    serial_no: item.itemType === "gift" ? "" : item.serialNo || "",
    model:
      item.itemType === "gift"
        ? `GIFT: ${item.description || "Complimentary Item"}`
        : item.model || "",
    cpu: item.itemType === "gift" ? "" : item.cpu || "",
    generation: item.itemType === "gift" ? "" : item.generation || "",
    ram:
      item.itemType === "gift"
        ? `Qty ${item.quantity || 1}`
        : item.ram || "",
    storage:
      item.itemType === "gift"
        ? item.isComplimentary
          ? "Complimentary"
          : "Chargeable Gift"
        : item.storage || "",
    graphic_card: item.itemType === "gift" ? "" : item.graphicCard || "",
    price: getLineTotal(item),
    amount: getLineTotal(item),
    description: getDisplayDescription(item),
  });

  const insertSaleItem = async (
    saleId: number,
    item: InvoiceItem,
    fallbackLaptopId: number | null
  ) => {
    const extendedPayload = buildExtendedSalesItemPayload(
      saleId,
      item,
      fallbackLaptopId
    );
    const { error } = await supabase.from("sales_items").insert(extendedPayload);

    if (!error) return;

    const message = error.message?.toLowerCase?.() || "";
    const shouldFallback =
      message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("is_complimentary") ||
      message.includes("item_type") ||
      message.includes("graphic_card") ||
      message.includes("laptop_id");

    if (!shouldFallback) {
      throw error;
    }

    const { error: legacyError } = await supabase
      .from("sales_items")
      .insert(buildLegacySalesItemPayload(saleId, item, fallbackLaptopId));

    if (legacyError) throw legacyError;
  };

  const insertSaleTransfer = async (
    saleId: number,
    item: InvoiceItem,
    invoiceNo: string
  ) => {
    const basePayload = {
      laptop_id: item.laptopId,
      from_location: item.sourceLocation || "Main Warehouse",
      to_location: "Sold",
      person_name: customer.name,
      contact_info: customer.mobile,
      address: customer.address,
      remarks: `Sold via ${invoiceNo}`,
      transfer_date: new Date().toISOString(),
      sale_invoice_id: saleId,
    };

    const { error } = await supabase.from("transfers").insert({
      ...basePayload,
      transfer_type: "sale",
    });
    if (!error) return;

    const message = error.message?.toLowerCase?.() || "";

    const candidatePayloads: any[] = [];

    if (message.includes("transfer_type_check")) {
      candidatePayloads.push({
        ...basePayload,
        transfer_type: getCompatibleTransferType(basePayload.from_location),
      });
    }

    if (message.includes("sale_invoice_id")) {
      candidatePayloads.push({
        ...basePayload,
        transfer_type: "sale",
      });
    }

    if (
      message.includes("transfer_type_check") &&
      message.includes("sale_invoice_id")
    ) {
      candidatePayloads.push({
        ...basePayload,
        transfer_type: getCompatibleTransferType(basePayload.from_location),
      });
    }

    for (const candidate of candidatePayloads) {
      const {
        sale_invoice_id: _ignoredSaleInvoiceId,
        ...withoutSaleInvoiceId
      } = candidate;

      const variants = [
        candidate,
        withoutSaleInvoiceId,
      ];

      for (const variant of variants) {
        const { error: variantError } = await supabase
          .from("transfers")
          .insert(variant);

        if (!variantError) return;
      }
    }

    throw error;
  };

  const saveInvoice = async (shareOnWhatsapp = false) => {
    if (!customer.name.trim()) {
      toast.error("Customer name required hai.");
      return;
    }

    if (!salesmanName) {
      toast.error("Salesman select karna zaroori hai.");
      return;
    }

    if (!items.length) {
      toast.error("Kam se kam ek item add kijiye.");
      return;
    }

    const invalidGift = items.some(
      (item) => item.itemType === "gift" && !item.description.trim()
    );
    if (invalidGift) {
      toast.error("Gift item ke liye description zaroor add kijiye.");
      return;
    }

    const invalidLaptop = items.some(
      (item) =>
        item.itemType === "laptop" &&
        ![item.machineCode, item.serialNo, item.model].some((value) =>
          value.trim()
        )
    );
    if (invalidLaptop) {
      toast.error("Laptop item me machine code, serial no ya model zaroor bhariye.");
      return;
    }

    if (
      paymentMode === "partial" &&
      Math.abs(Number(cashAmount || 0) + Number(onlineAmount || 0) - total) >
      0.01
    ) {
      toast.error("Partial payment me Cash + Online total ke barabar hona chahiye.");
      return;
    }

    if (isBajajMode(paymentMode)) {
      if (financeDpTotal <= 0) {
        toast.error("DP amount required hai.");
        return;
      }
      if (financeDpTotal > total) {
        toast.error("DP amount total se zyada nahi ho sakta.");
        return;
      }
      if (dpPaymentMode === "partial_cash_online") {
        if (partialDpCashAmount < 0 || partialDpOnlineAmount < 0) {
          toast.error("Cash DP aur Online DP negative nahi ho sakte.");
          return;
        }
      }
      if (installmentCount <= 0) {
        toast.error("Installment count required hai.");
        return;
      }
    }

    if (isCreditCardMode(paymentMode)) {
      if (!bankName.trim()) {
        toast.error("Bank Name is required for Credit Card payment.");
        return;
      }
      if (installmentCount <= 0) {
        toast.error("EMI Months (Installments) required hai.");
        return;
      }
      if (!emiAmount || Number(emiAmount) <= 0) {
        toast.error("EMI Amount required hai.");
        return;
      }
    }

    setSaving(true);
    const invoiceNo = isEditMode ? invoiceNoPreview : await generateInvoiceNo();
    setInvoiceNoPreview(invoiceNo);

    try {
      const financeFields =
        isBajajMode(paymentMode)
          ? buildFinanceDpSaveFields({
              dpPaymentMode,
              financeDpAmount,
              partialDpCashAmount,
              partialDpOnlineAmount,
              paymentNarration,
            })
          : {
              finance_dp_amount: 0,
              dp_payment_mode: null,
              partial_dp_cash_amount: null,
              partial_dp_online_amount: null,
              payment_narration: paymentNarration || null,
            };

      const finalInstallmentCount = (isBajajMode(paymentMode) || isCreditCardMode(paymentMode))
        ? Number(installmentCount || 0)
        : 0;

      const salePayload: any = {
        invoice_no: invoiceNo,
        invoice_date: invoiceDate,
        customer_name: customer.name,
        customer_mobile: customer.mobile,
        customer_address: customer.address,
        customer_gst: customer.gst || null,
        total_amount: total,
        payment_mode: paymentMode,
        cash_amount:
          paymentMode === "cash"
            ? total
            : paymentMode === "partial" || isCreditCardMode(paymentMode)
              ? Number(cashAmount || 0)
              : 0,
        online_amount:
          paymentMode === "online"
            ? total
            : paymentMode === "partial" || isCreditCardMode(paymentMode)
              ? Number(onlineAmount || 0)
              : 0,
        finance_dp_amount: financeFields.finance_dp_amount,
        installment_count: finalInstallmentCount,
        dp_payment_mode: financeFields.dp_payment_mode,
        partial_dp_cash_amount: financeFields.partial_dp_cash_amount,
        partial_dp_online_amount: financeFields.partial_dp_online_amount,
        payment_narration: paymentNarration || null,
        salesman_name: salesmanName,
      };

      if (isCreditCardMode(paymentMode)) {
        salePayload.bank_name = bankName;
        salePayload.emi_amount = Number(emiAmount || 0);
      } else {
        salePayload.bank_name = null;
        salePayload.emi_amount = null;
      }

      const runSaleMutation = (payload: typeof salePayload) =>
        isEditMode
          ? supabase.from("sales").update(payload).eq("id", Number(saleId)).select().single()
          : supabase.from("sales").insert(payload).select().single();

      let saleRow: { id: number } | null = null;
      let saleError: { message?: string } | null = null;

      ({ data: saleRow, error: saleError } = await runSaleMutation(salePayload));

      if (
        saleError?.message &&
        isMissingExtendedSalesColumnError(saleError.message)
      ) {
        console.warn(
          "Extended sales columns not found; saving without partial DP / narration fields.",
          saleError.message
        );
        ({ data: saleRow, error: saleError } = await runSaleMutation(
          stripExtendedSalesFields(salePayload) as typeof salePayload
        ));
      }

      if (saleError || !saleRow) {
        throw new Error(saleError?.message || "Sale record create nahi hua.");
      }

      if (isEditMode) {
        const { data: previousItems } = await supabase
          .from("sales_items")
          .select("laptop_id")
          .or(`sale_id.eq.${saleId},invoice_id.eq.${saleId}`);

        const previousLaptopIds = (previousItems || [])
          .map((entry: any) => entry.laptop_id)
          .filter((value: number | null): value is number => Boolean(value));

        if (previousLaptopIds.length) {
          await supabase
            .from("laptop_tests")
            .update({ status: "In Stock" })
            .in("id", previousLaptopIds);
        }

        await supabase.from("transfers").delete().eq("sale_invoice_id", saleRow.id);
        await supabase
          .from("sales_items")
          .delete()
          .or(`sale_id.eq.${saleRow.id},invoice_id.eq.${saleRow.id}`);
      }

      const fallbackLaptopId = getFallbackLaptopId(items);

      for (const item of items) {
        await insertSaleItem(saleRow.id, item, fallbackLaptopId);

        if (item.itemType === "laptop" && item.laptopId) {
          const { error: updateError } = await supabase
            .from("laptop_tests")
            .update({ status: "sold" })
            .eq("id", item.laptopId);

          if (updateError) {
            throw updateError;
          }

          await insertSaleTransfer(saleRow.id, item, invoiceNo);
        }
      }

      const pdfBlob = await generatePdfBlob(invoiceNo, items, customer);
      const filename = `${invoiceNo}.pdf`;
      const filePath = `invoices/${filename}`;
      let publicUrl = "";
      let shareUrl = "";

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.warn("Invoice upload error:", uploadError.message);
        if (uploadError.message?.toLowerCase().includes("bucket not found")) {
          toast("Invoice save ho gayi, lekin Supabase storage bucket `invoices` nahi mila.");
        } else {
          toast("Invoice save ho gayi, lekin PDF upload nahi ho payi.");
        }
      } else {
        const publicUrlResult = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath);

        publicUrl = publicUrlResult.data.publicUrl || "";

        const { data: signedData, error: signedError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(filePath, 60 * 60 * 24 * 7);

        if (!signedError && signedData?.signedUrl) {
          shareUrl = signedData.signedUrl;
        }

        const { error: updatePdfMetaError } = await supabase
          .from("sales")
          .update({
            invoice_pdf_url: publicUrl,
            invoice_file_path: filePath,
          })
          .eq("id", saleRow.id);

        if (updatePdfMetaError) {
          console.warn("sales PDF meta update skipped:", updatePdfMetaError.message);
        }
      }

      try {
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, "_blank");
      } catch {
        console.warn("Could not open generated PDF preview.");
      }

      if (shareOnWhatsapp && customer.mobile.trim()) {
        let phone = customer.mobile.replace(/\D/g, "");
        if (phone.length === 10) {
          phone = `91${phone}`;
        }
        const message = [
          `Hello ${customer.name},`,
          `Your invoice ${invoiceNo} is ready.`,
          shareUrl
            ? `Download PDF: ${shareUrl}`
            : publicUrl
              ? `Download PDF: ${publicUrl}`
              : "Invoice PDF upload pending.",
          `Total Amount: ${formatCurrency(total)}`,
        ].join("\n");
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
          "_blank"
        );
      }

      toast.success(
        isEditMode
          ? "Sale invoice updated successfully."
          : "Sale invoice successfully save ho gayi."
      );
      navigate("/sales");
    } catch (error: any) {
      console.error("saveInvoice error:", error);
      const rawMessage = error?.message || "Unknown error";
      if (rawMessage.toLowerCase().includes("row-level security policy")) {
        toast.error(
          "Supabase policy missing hai: `sales`/`sales_items` table par insert allow kijiye."
        );
      } else {
        toast.error(`Invoice save nahi ho payi: ${rawMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-gray-500">Loading invoice page...</p>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isEditMode ? "Edit Sale Invoice" : "Create Sale Invoice"}
          </h1>
          <p className="text-sm text-gray-500">
            As soon as the sale is saved, the laptop will be marked as 'Sold' in the inventory and added to the sales list.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(isEditMode ? "/sales" : "/laptop-inventory")}
          className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          Back to Inventory
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice No
            </label>
            <input
              className="border p-2.5 w-full rounded-lg bg-gray-50"
              value={invoiceNoPreview}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Date
            </label>
            <input
              type="date"
              className="border p-2.5 w-full rounded-lg"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}
              className="border p-2.5 w-full rounded-lg"
            >
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="partial">Partial (Cash + Online)</option>
              <option value="bajaj_card">Bajaj Card</option>
              <option value="credit_card">Credit Card</option>
              <option value="on_credit">On Credit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salesman
            </label>
            <select
              value={salesmanName}
              onChange={(event) => setSalesmanName(event.target.value)}
              className="border p-2.5 w-full rounded-lg"
              required
            >
              <option value="">Select Salesman</option>
              {SALES_TEAM.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-2xl p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Customer Details</h2>
            <div className="space-y-3">
              <input
                className="border p-2.5 w-full rounded-lg"
                placeholder="Customer Name"
                value={customer.name}
                onChange={(event) =>
                  setCustomer((current) => ({ ...current, name: event.target.value }))
                }
              />
              <input
                className="border p-2.5 w-full rounded-lg"
                placeholder="Mobile Number"
                value={customer.mobile}
                onChange={(event) =>
                  setCustomer((current) => ({ ...current, mobile: event.target.value }))
                }
              />
              <textarea
                className="border p-2.5 w-full rounded-lg min-h-[92px]"
                placeholder="Customer Address"
                value={customer.address}
                onChange={(event) =>
                  setCustomer((current) => ({ ...current, address: event.target.value }))
                }
              />
              <input
                className="border p-2.5 w-full rounded-lg"
                placeholder="GST Number (optional)"
                value={customer.gst}
                onChange={(event) =>
                  setCustomer((current) => ({ ...current, gst: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Payment Summary</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base text-gray-900">
                <span>Grand Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              {paymentMode === "partial" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <input
                    type="number"
                    min="0"
                    className="border p-2.5 rounded-lg"
                    placeholder="Cash Amount"
                    value={String(cashAmount || "")}
                    onChange={(event) =>
                      setCashAmount(normalizePositiveNumber(event.target.value))
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    className="border p-2.5 rounded-lg"
                    placeholder="Online Amount"
                    value={String(onlineAmount || "")}
                    onChange={(event) =>
                      setOnlineAmount(normalizePositiveNumber(event.target.value))
                    }
                  />
                  <p className="md:col-span-2 text-xs text-gray-500">
                    Cash + Online exactly {formatCurrency(total)} hona chahiye.
                  </p>
                </div>
              )}

              {isBajajMode(paymentMode) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <select
                    value={dpPaymentMode}
                    onChange={(event) =>
                      setDpPaymentMode(event.target.value as FinanceDpMode)
                    }
                    className="border p-2.5 rounded-lg md:col-span-2"
                  >
                    <option value="cash">DP Received in Cash</option>
                    <option value="online">DP Received Online</option>
                    <option value="partial_cash_online">
                      DP Received Partially (Cash + Online)
                    </option>
                  </select>
                  {dpPaymentMode === "partial_cash_online" ? (
                    <>
                      <input
                        type="number"
                        min="0"
                        className="border p-2.5 rounded-lg"
                        placeholder="Cash DP Amount"
                        value={String(partialDpCashAmount || "")}
                        onChange={(event) =>
                          setPartialDpCashAmount(
                            normalizePositiveNumber(event.target.value)
                          )
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        className="border p-2.5 rounded-lg"
                        placeholder="Online DP Amount"
                        value={String(partialDpOnlineAmount || "")}
                        onChange={(event) =>
                          setPartialDpOnlineAmount(
                            normalizePositiveNumber(event.target.value)
                          )
                        }
                      />
                      <p className="md:col-span-2 text-xs font-medium text-gray-700">
                        Total DP: {formatCurrency(financeDpTotal)}
                      </p>
                    </>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      className="border p-2.5 rounded-lg md:col-span-2"
                      placeholder="DP Amount"
                      value={String(financeDpAmount || "")}
                      onChange={(event) =>
                        setFinanceDpAmount(normalizePositiveNumber(event.target.value))
                      }
                    />
                  )}
                  <input
                    type="number"
                    min="1"
                    className="border p-2.5 rounded-lg md:col-span-2"
                    placeholder="Installments"
                    value={String(installmentCount || "")}
                    onChange={(event) =>
                      setInstallmentCount(normalizePositiveNumber(event.target.value))
                    }
                  />
                  <p className="md:col-span-2 text-xs text-gray-500">
                    DP amount selected mode me capture hoga, aur remaining amount financed mana jayega.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Narration (Optional)
                </label>
                <textarea
                  className="w-full border p-2.5 rounded-lg min-h-[72px]"
                  placeholder="e.g. Customer requested delivery after finance approval."
                  value={paymentNarration}
                  onChange={(event) => setPaymentNarration(event.target.value)}
                />
              </div>

              {isBajajMode(paymentMode) && (
                <div className="pt-3 border-t border-gray-100">
                  <FinanceDpDetails
                    source={financeDpSource}
                    formatAmount={formatCurrency}
                    className="text-sm text-gray-700"
                  />
                </div>
              )}

              {isCreditCardMode(paymentMode) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <input
                    type="text"
                    className="border p-2.5 rounded-lg md:col-span-2"
                    placeholder="Bank Name"
                    value={bankName}
                    onChange={(event) => setBankName(event.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    className="border p-2.5 rounded-lg"
                    placeholder="EMI Months"
                    value={String(installmentCount || "")}
                    onChange={(event) =>
                      setInstallmentCount(normalizePositiveNumber(event.target.value))
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    className="border p-2.5 rounded-lg"
                    placeholder="EMI Amount"
                    value={String(emiAmount || "")}
                    onChange={(event) =>
                      setEmiAmount(normalizePositiveNumber(event.target.value))
                    }
                  />
                  <h3 className="md:col-span-2 text-sm font-medium text-gray-700 pt-2 border-t border-gray-100">
                    Customer Contribution (Optional)
                  </h3>
                  <input
                    type="number"
                    min="0"
                    className="border p-2.5 rounded-lg"
                    placeholder="Cash Amount"
                    value={String(cashAmount || "")}
                    onChange={(event) =>
                      setCashAmount(normalizePositiveNumber(event.target.value))
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    className="border p-2.5 rounded-lg"
                    placeholder="Online Amount"
                    value={String(onlineAmount || "")}
                    onChange={(event) =>
                      setOnlineAmount(normalizePositiveNumber(event.target.value))
                    }
                  />
                  <p className="md:col-span-2 text-xs text-gray-500">
                    Note: For Credit Card, the full total is considered received via Bank. Any customer contribution here is for record keeping of downpayments.
                  </p>
                </div>
              )}

              {paymentMode === "on_credit" && (
                <p className="text-xs text-amber-700 pt-2">
                  This invoice can be edited later from the Sales page when payment is received.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-gray-900">Invoice Items</h2>
              <p className="text-sm text-gray-500">
                You can also add complimentary or chargeable gift items along with the laptop.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg"
                onClick={addLaptopItem}
              >
                + Add Laptop
              </button>
              <button
                type="button"
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg"
                onClick={addGiftItem}
              >
                + Add Gift
              </button>
            </div>
          </div>

          {items.map((item, index) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-2xl p-4 bg-gray-50"
            >
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Item {index + 1}{" "}
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-white border border-gray-200 ml-2">
                      {item.itemType === "gift"
                        ? item.isComplimentary
                          ? "Gift Item"
                          : "Additional Item"
                        : "Laptop"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {item.itemType === "gift"
                      ? "This item line will be captured in both the invoice and reports."
                      : "After the laptop sale, the inventory status will change to Sold."}
                  </p>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    className="text-red-600 text-sm"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                )}
              </div>

              {item.itemType === "gift" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    className="border p-2.5 rounded-lg md:col-span-2"
                    placeholder="Gift Description"
                    value={item.description}
                    onChange={(event) =>
                      updateItem(item.id, "description", event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    className="border p-2.5 rounded-lg"
                    placeholder="Quantity"
                    value={String(item.quantity || 1)}
                    onChange={(event) =>
                      updateItem(item.id, "quantity", event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    className="border p-2.5 rounded-lg"
                    placeholder="Gift Value / Price"
                    value={String(item.unitPrice || "")}
                    onChange={(event) =>
                      updateItem(item.id, "unitPrice", event.target.value)
                    }
                    disabled={item.isComplimentary}
                  />
                  <label className="md:col-span-2 flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={item.isComplimentary}
                      onChange={(event) =>
                        updateItem(item.id, "isComplimentary", event.target.checked)
                      }
                    />
                    Complimentary gift
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    className="border p-2.5 rounded-lg"
                    placeholder="Machine Code"
                    value={item.machineCode}
                    onChange={(event) =>
                      updateItem(item.id, "machineCode", event.target.value)
                    }
                    onBlur={(event) =>
                      loadLaptopByMachineCode(
                        item.id,
                        event.target.value,
                        isEditMode
                      )
                    }
                  />
                  <input
                    className="border p-2.5 rounded-lg"
                    placeholder="Serial No"
                    value={item.serialNo}
                    onChange={(event) =>
                      updateItem(item.id, "serialNo", event.target.value)
                    }
                  />
                  <input
                    className="border p-2.5 rounded-lg"
                    placeholder="Model"
                    value={item.model}
                    onChange={(event) =>
                      updateItem(item.id, "model", event.target.value)
                    }
                  />
                  <input
                    className="border p-2.5 rounded-lg"
                    placeholder="CPU"
                    value={item.cpu}
                    onChange={(event) =>
                      updateItem(item.id, "cpu", event.target.value)
                    }
                  />
                  <input
                    className="border p-2.5 rounded-lg"
                    placeholder="Generation"
                    value={item.generation}
                    onChange={(event) =>
                      updateItem(item.id, "generation", event.target.value)
                    }
                  />
                  <input
                    className="border p-2.5 rounded-lg"
                    placeholder="RAM"
                    value={item.ram}
                    onChange={(event) =>
                      updateItem(item.id, "ram", event.target.value)
                    }
                  />
                  <input
                    className="border p-2.5 rounded-lg"
                    placeholder="Storage"
                    value={item.storage}
                    onChange={(event) =>
                      updateItem(item.id, "storage", event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    className="border p-2.5 rounded-lg"
                    placeholder="Sale Price"
                    value={String(item.unitPrice || "")}
                    onChange={(event) =>
                      updateItem(item.id, "unitPrice", event.target.value)
                    }
                  />
                </div>
              )}

              <div className="mt-3 text-right text-sm font-semibold text-gray-800">
                Line Total: {formatCurrency(getLineTotal(item))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 flex-wrap">
          <button
            type="button"
            className="border border-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50"
            onClick={() => navigate(isEditMode ? "/sales" : "/laptop-inventory")}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg"
            onClick={() => saveInvoice(false)}
            disabled={saving}
          >
            {saving ? "Saving..." : isEditMode ? "Update Invoice" : "Save Invoice"}
          </button>
          <button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg"
            onClick={() => saveInvoice(true)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save & Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
