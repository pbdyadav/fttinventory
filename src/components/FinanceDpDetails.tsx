import {
  getFinancePaymentDisplay,
  type FinanceDpSource,
} from "@/lib/financeDp";

type FinanceDpDetailsProps = {
  source: FinanceDpSource;
  formatAmount?: (value: number) => string;
  className?: string;
};

const defaultFormatAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function FinanceDpDetails({
  source,
  formatAmount = defaultFormatAmount,
  className = "",
}: FinanceDpDetailsProps) {
  const display = getFinancePaymentDisplay(source);
  if (!display) return null;

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div>Payment Mode: {display.paymentModeLabel}</div>
      {display.isPartialBreakup ? (
        <>
          <div className="font-medium text-gray-600">DP Details:</div>
          <div>Cash {formatAmount(display.cashAmount)}</div>
          <div>Online {formatAmount(display.onlineAmount)}</div>
          <div>Total DP {formatAmount(display.totalDp)}</div>
          <div>Financed Amount {formatAmount(display.financedAmount)}</div>
        </>
      ) : (
        <>
          <div>
            DP ({display.legacyDpLabel}): {formatAmount(display.totalDp)}
            {display.installmentCount > 0
              ? ` | EMI: ${display.installmentCount}`
              : ""}
          </div>
          <div>Financed Amount {formatAmount(display.financedAmount)}</div>
        </>
      )}
      {display.narration ? (
        <div className="pt-0.5">Narration: {display.narration}</div>
      ) : null}
    </div>
  );
}
