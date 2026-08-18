export type SalesPeriodKey =
  | "today"
  | "this_week"
  | "this_month"
  | "previous_month"
  | "current_fy"
  | "previous_fy"
  | "custom";

export type DateRange = {
  dateFrom: string;
  dateTo: string;
};

export type SalesPeriodOption = {
  value: SalesPeriodKey;
  label: string;
};

export const SALES_PERIOD_OPTIONS: SalesPeriodOption[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "previous_month", label: "Previous Month" },
  { value: "current_fy", label: "Current FY" },
  { value: "previous_fy", label: "Previous FY" },
  { value: "custom", label: "Custom" },
];

export type ReportViewKey = "details" | "summary" | "summary_previous_period";

export type ReportViewOption = {
  value: ReportViewKey;
  label: string;
};

export const REPORT_VIEW_OPTIONS: ReportViewOption[] = [
  { value: "details", label: "Details" },
  { value: "summary", label: "Summary" },
];

export const SALES_REPORT_VIEW_OPTIONS: ReportViewOption[] = [
  { value: "details", label: "Details" },
  { value: "summary", label: "Summary" },
  {
    value: "summary_previous_period",
    label: "Summary + previous period",
  },
];

export type SalesSummaryGroupByKey = "voucher" | "buyer" | "stock_item" | "stock_group";

export type SalesSummaryGroupByOption = {
  value: SalesSummaryGroupByKey;
  label: string;
};

export const SALES_SUMMARY_GROUP_BY_OPTIONS: SalesSummaryGroupByOption[] = [
  { value: "stock_group", label: "Stock group" },
  { value: "buyer", label: "Buyer" },
  { value: "stock_item", label: "Stock item" },
  { value: "voucher", label: "Voucher" },
];

export type PurchaseSummaryGroupByKey =
  "voucher" | "supplier" | "stock_item" | "stock_group" | "stock_group_vendor";

export type PurchaseSummaryGroupByOption = {
  value: PurchaseSummaryGroupByKey;
  label: string;
};

export const PURCHASE_SUMMARY_GROUP_BY_OPTIONS: PurchaseSummaryGroupByOption[] = [
  { value: "stock_group", label: "Stock group" },
  { value: "stock_group_vendor", label: "Stock group + vendor" },
  { value: "supplier", label: "Supplier" },
  { value: "stock_item", label: "Stock item" },
  { value: "voucher", label: "Voucher" },
];

/** Indian FY month order: Apr → Mar. */
export const FY_MONTH_LABELS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
] as const;

export function isFinancialYearPeriod(period: SalesPeriodKey) {
  return period === "current_fy" || period === "previous_fy";
}

export function emptyFyMonthQtys(): number[] {
  return Array.from({ length: FY_MONTH_LABELS.length }, () => 0);
}

/** Index 0=Apr … 11=Mar within the FY that starts on `fyStartYear`-04-01. */
export function fyMonthIndex(
  voucherDate: string | null | undefined,
  fyStartYear: number,
): number | null {
  if (!voucherDate) {
    return null;
  }
  const day = voucherDate.slice(0, 10);
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  if (!year || !month) {
    return null;
  }
  if (month >= 4) {
    if (year !== fyStartYear) {
      return null;
    }
    return month - 4;
  }
  if (year !== fyStartYear + 1) {
    return null;
  }
  return month + 8;
}

export function fyStartYearFromRange(range: DateRange) {
  return Number(range.dateFrom.slice(0, 4));
}

/**
 * How many FY months to show (Apr=1 … Mar=12), excluding months after `reference`.
 * Past FYs return all 12; the current FY returns through the current month.
 */
export function visibleFyMonthCount(
  fyStartYear: number,
  reference = new Date(),
): number {
  const refYear = reference.getFullYear();
  const refMonth = reference.getMonth() + 1;
  const currentFyStart = refMonth >= 4 ? refYear : refYear - 1;
  if (fyStartYear < currentFyStart) {
    return FY_MONTH_LABELS.length;
  }
  if (fyStartYear > currentFyStart) {
    return 0;
  }
  const index = refMonth >= 4 ? refMonth - 4 : refMonth + 8;
  return index + 1;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfIsoWeek(date: Date) {
  const copy = new Date(date);
  const weekday = copy.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfIsoWeek(date: Date) {
  const end = startOfIsoWeek(date);
  end.setDate(end.getDate() + 6);
  return end;
}

function getCurrentFyRange(reference: Date): DateRange {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const fyStartYear = month >= 3 ? year : year - 1;
  return {
    dateFrom: toIsoDate(new Date(fyStartYear, 3, 1)),
    dateTo: toIsoDate(new Date(fyStartYear + 1, 2, 31)),
  };
}

function getPreviousFyRange(reference: Date): DateRange {
  const current = getCurrentFyRange(reference);
  const from = new Date(current.dateFrom);
  const to = new Date(current.dateTo);
  from.setFullYear(from.getFullYear() - 1);
  to.setFullYear(to.getFullYear() - 1);
  return {
    dateFrom: toIsoDate(from),
    dateTo: toIsoDate(to),
  };
}

export function defaultCustomRange(reference = new Date()): DateRange {
  return {
    dateFrom: toIsoDate(new Date(reference.getFullYear(), reference.getMonth(), 1)),
    dateTo: toIsoDate(reference),
  };
}

export function resolveSalesPeriodRange(
  period: SalesPeriodKey,
  customRange: DateRange,
  reference = new Date(),
): DateRange {
  const today = toIsoDate(reference);

  switch (period) {
    case "today":
      return { dateFrom: today, dateTo: today };
    case "this_week":
      return {
        dateFrom: toIsoDate(startOfIsoWeek(reference)),
        dateTo: toIsoDate(endOfIsoWeek(reference)),
      };
    case "this_month":
      return {
        dateFrom: toIsoDate(new Date(reference.getFullYear(), reference.getMonth(), 1)),
        dateTo: toIsoDate(
          new Date(reference.getFullYear(), reference.getMonth() + 1, 0),
        ),
      };
    case "previous_month": {
      const start = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
      const end = new Date(reference.getFullYear(), reference.getMonth(), 0);
      return {
        dateFrom: toIsoDate(start),
        dateTo: toIsoDate(end),
      };
    }
    case "current_fy":
      return getCurrentFyRange(reference);
    case "previous_fy":
      return getPreviousFyRange(reference);
    case "custom":
      return customRange;
    default:
      return { dateFrom: today, dateTo: today };
  }
}

export function isDateInRange(value: string | null | undefined, range: DateRange) {
  if (!value) {
    return false;
  }
  const day = value.slice(0, 10);
  return day >= range.dateFrom && day <= range.dateTo;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function shiftRangeByLength(range: DateRange): DateRange {
  const from = parseIsoDate(range.dateFrom);
  const to = parseIsoDate(range.dateTo);
  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1,
  );
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return {
    dateFrom: toIsoDate(prevFrom),
    dateTo: toIsoDate(prevTo),
  };
}

export function resolvePreviousPeriodRange(
  period: SalesPeriodKey,
  activeRange: DateRange,
  customRange: DateRange,
  reference = new Date(),
): DateRange {
  switch (period) {
    case "today": {
      const yesterday = new Date(reference);
      yesterday.setDate(yesterday.getDate() - 1);
      const day = toIsoDate(yesterday);
      return { dateFrom: day, dateTo: day };
    }
    case "this_week": {
      const start = startOfIsoWeek(reference);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
    }
    case "this_month":
      return resolveSalesPeriodRange("previous_month", customRange, reference);
    case "previous_month": {
      const start = new Date(reference.getFullYear(), reference.getMonth() - 2, 1);
      const end = new Date(reference.getFullYear(), reference.getMonth() - 1, 0);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
    }
    case "current_fy":
      return resolveSalesPeriodRange("previous_fy", customRange, reference);
    case "previous_fy": {
      const prev = getPreviousFyRange(reference);
      const from = parseIsoDate(prev.dateFrom);
      const to = parseIsoDate(prev.dateTo);
      from.setFullYear(from.getFullYear() - 1);
      to.setFullYear(to.getFullYear() - 1);
      return {
        dateFrom: toIsoDate(from),
        dateTo: toIsoDate(to),
      };
    }
    case "custom":
      return shiftRangeByLength(activeRange);
    default:
      return shiftRangeByLength(activeRange);
  }
}

export type StockPnlPeriodKey =
  | "all"
  | "this_week"
  | "previous_week"
  | "this_month"
  | "current_fy";

export type StockPnlPeriodOption = {
  value: StockPnlPeriodKey;
  label: string;
};

export const STOCK_PNL_PERIOD_OPTIONS: StockPnlPeriodOption[] = [
  { value: "all", label: "All sales" },
  { value: "this_week", label: "This week" },
  { value: "previous_week", label: "Previous week" },
  { value: "this_month", label: "This month" },
  { value: "current_fy", label: "Current FY" },
];

export type PnlResultFilterKey = "all" | "profits" | "losses";

export type PnlResultFilterOption = {
  value: PnlResultFilterKey;
  label: string;
};

export const PNL_RESULT_FILTER_OPTIONS: PnlResultFilterOption[] = [
  { value: "profits", label: "Profits" },
  { value: "losses", label: "Losses" },
];

export function resolveStockPnlPeriodRange(
  period: StockPnlPeriodKey,
  reference = new Date(),
): DateRange | null {
  if (period === "all") {
    return null;
  }

  const today = toIsoDate(reference);

  switch (period) {
    case "this_week":
      return {
        dateFrom: toIsoDate(startOfIsoWeek(reference)),
        dateTo: toIsoDate(endOfIsoWeek(reference)),
      };
    case "previous_week": {
      const start = startOfIsoWeek(reference);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
    }
    case "this_month":
      return {
        dateFrom: toIsoDate(new Date(reference.getFullYear(), reference.getMonth(), 1)),
        dateTo: toIsoDate(
          new Date(reference.getFullYear(), reference.getMonth() + 1, 0),
        ),
      };
    case "current_fy":
      return getCurrentFyRange(reference);
    default:
      return { dateFrom: today, dateTo: today };
  }
}
