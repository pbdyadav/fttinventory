export type FinanceDpMode = "cash" | "online" | "partial_cash_online";

export type FinanceDpSource = {
  payment_mode?: string | null;
  total_amount?: number | string | null;
  dp_payment_mode?: string | null;
  finance_dp_amount?: number | string | null;
  partial_dp_cash_amount?: number | string | null;
  partial_dp_online_amount?: number | string | null;
  installment_count?: number | string | null;
  payment_narration?: string | null;
  bank_name?: string | null;
  emi_amount?: number | string | null;
  cash_amount?: number | string | null;
  online_amount?: number | string | null;
};

export type FinanceDpBreakdown = {
  mode: FinanceDpMode;
  cashAmount: number;
  onlineAmount: number;
  totalAmount: number;
};

export type FinancePaymentDisplay = {
  paymentModeLabel: string;
  isPartialBreakup: boolean;
  cashAmount: number;
  onlineAmount: number;
  totalDp: number;
  financedAmount: number;
  installmentCount: number;
  narration: string | null;
  legacyDpLabel: string;
};

const toNumber = (value: number | string | null | undefined) =>
  Number(value || 0);

export const getFinanceDpMode = (source: FinanceDpSource): FinanceDpMode => {
  if (source.dp_payment_mode === "partial_cash_online") {
    return "partial_cash_online";
  }
  if (source.dp_payment_mode === "online") return "online";
  if (source.dp_payment_mode === "cash") return "cash";

  const cashAmount = toNumber(source.partial_dp_cash_amount);
  const onlineAmount = toNumber(source.partial_dp_online_amount);

  if (cashAmount > 0 && onlineAmount > 0) return "partial_cash_online";
  if (onlineAmount > 0 && cashAmount === 0) return "online";
  return "cash";
};

export const getFinanceDpBreakdown = (
  source: FinanceDpSource
): FinanceDpBreakdown => {
  const mode = getFinanceDpMode(source);
  const legacyTotal = toNumber(source.finance_dp_amount);
  const cashAmount = toNumber(source.partial_dp_cash_amount);
  const onlineAmount = toNumber(source.partial_dp_online_amount);

  if (mode === "partial_cash_online") {
    return {
      mode,
      cashAmount,
      onlineAmount,
      totalAmount: legacyTotal || cashAmount + onlineAmount,
    };
  }

  if (mode === "online") {
    const total = legacyTotal || onlineAmount;
    return {
      mode,
      cashAmount: 0,
      onlineAmount: total,
      totalAmount: total,
    };
  }

  const total = legacyTotal || cashAmount;
  return {
    mode,
    cashAmount: total,
    onlineAmount: 0,
    totalAmount: total,
  };
};

export const getFinancePaymentDisplay = (
  source: FinanceDpSource
): FinancePaymentDisplay | null => {
  const isFinance =
    source.payment_mode === "finance_card" ||
    source.payment_mode === "bajaj_card";
    
  if (!isFinance) return null;

  const grandTotal = toNumber(source.total_amount);
  const breakdown = getFinanceDpBreakdown(source);
  const isPartialBreakup = breakdown.mode === "partial_cash_online";
  
  let label = "Bajaj Finance / Credit Card";
  if (source.payment_mode === "bajaj_card") label = "Bajaj Card";

  return {
    paymentModeLabel: label,
    isPartialBreakup,
    cashAmount: breakdown.cashAmount,
    onlineAmount: breakdown.onlineAmount,
    totalDp: breakdown.totalAmount,
    financedAmount: Math.max(0, grandTotal - breakdown.totalAmount),
    installmentCount: toNumber(source.installment_count),
    narration: (source.payment_narration || "").trim() || null,
    legacyDpLabel:
      breakdown.mode === "online"
        ? "Online"
        : breakdown.mode === "partial_cash_online"
          ? "Cash + Online"
          : "Cash",
  };
};

export const buildFinanceDpSaveFields = (params: {
  dpPaymentMode: FinanceDpMode;
  financeDpAmount: number;
  partialDpCashAmount: number;
  partialDpOnlineAmount: number;
  paymentNarration: string;
}) => {
  const totalAmount =
    params.dpPaymentMode === "partial_cash_online"
      ? params.partialDpCashAmount + params.partialDpOnlineAmount
      : params.financeDpAmount;

  return {
    finance_dp_amount: totalAmount,
    dp_payment_mode: params.dpPaymentMode,
    partial_dp_cash_amount:
      params.dpPaymentMode === "partial_cash_online"
        ? params.partialDpCashAmount
        : null,
    partial_dp_online_amount:
      params.dpPaymentMode === "partial_cash_online"
        ? params.partialDpOnlineAmount
        : null,
    payment_narration: params.paymentNarration.trim() || null,
  };
};

export const stripExtendedSalesFields = <T extends Record<string, unknown>>(
  payload: T
) => {
  const {
    partial_dp_cash_amount: _cash,
    partial_dp_online_amount: _online,
    payment_narration: _narration,
    ...rest
  } = payload;
  return rest;
};

export const isMissingExtendedSalesColumnError = (message: string) => {
  const lower = (message || "").toLowerCase();
  return (
    lower.includes("partial_dp_cash_amount") ||
    lower.includes("partial_dp_online_amount") ||
    lower.includes("payment_narration") ||
    (lower.includes("column") &&
      (lower.includes("partial_dp") || lower.includes("payment_narration")))
  );
};

export const financeDpSourceFromForm = (params: {
  paymentMode: string;
  total: number;
  dpPaymentMode: FinanceDpMode;
  financeDpAmount: number;
  partialDpCashAmount: number;
  partialDpOnlineAmount: number;
  installmentCount: number;
  paymentNarration: string;
}): FinanceDpSource => {
  const financeFields = buildFinanceDpSaveFields({
    dpPaymentMode: params.dpPaymentMode,
    financeDpAmount: params.financeDpAmount,
    partialDpCashAmount: params.partialDpCashAmount,
    partialDpOnlineAmount: params.partialDpOnlineAmount,
    paymentNarration: params.paymentNarration,
  });

  return {
    payment_mode: params.paymentMode,
    total_amount: params.total,
    dp_payment_mode: financeFields.dp_payment_mode,
    finance_dp_amount: financeFields.finance_dp_amount,
    partial_dp_cash_amount: financeFields.partial_dp_cash_amount,
    partial_dp_online_amount: financeFields.partial_dp_online_amount,
    installment_count: params.installmentCount,
    payment_narration: financeFields.payment_narration,
  };
};

export const getFinanceDpRemarks = (source: FinanceDpSource) => {
  const display = getFinancePaymentDisplay(source);
  if (!display) return "";

  if (display.isPartialBreakup) {
    return [
      "DP Details:",
      `Cash ${display.cashAmount}`,
      `Online ${display.onlineAmount}`,
      `Total DP ${display.totalDp}`,
      `Financed Amount ${display.financedAmount}`,
      display.installmentCount
        ? `EMI: ${display.installmentCount}`
        : null,
      display.narration ? `Narration: ${display.narration}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return [
    `DP (${display.legacyDpLabel}): ${display.totalDp}`,
    display.installmentCount ? `EMI: ${display.installmentCount}` : null,
    display.narration ? `Narration: ${display.narration}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
};
