export type ReportPeriodKey =
  | "all"
  | "today"
  | "this_week"
  | "previous_week"
  | "this_month"
  | "previous_month"
  | "current_fy"
  | "previous_fy";

export type DateRange = {
  dateFrom: string;
  dateTo: string;
};

export const REPORT_PERIOD_OPTIONS: Array<{
  value: ReportPeriodKey;
  label: string;
}> = [
  { value: "this_month", label: "This month" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "previous_month", label: "Prev month" },
  { value: "current_fy", label: "Current FY" },
  { value: "previous_fy", label: "Prev FY" },
  { value: "all", label: "All" },
];

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

export const STOCK_PNL_PERIOD_OPTIONS: Array<{
  value: StockPnlPeriodKey;
  label: string;
}> = [
  { value: "all", label: "All sales" },
  { value: "this_week", label: "This week" },
  { value: "previous_week", label: "Prev week" },
  { value: "this_month", label: "This month" },
  { value: "current_fy", label: "Current FY" },
];

export type StockPnlPeriodKey =
  | "all"
  | "this_week"
  | "previous_week"
  | "this_month"
  | "current_fy";

export type PnlResultFilterKey = "all" | "profits" | "losses";

export const PNL_RESULT_FILTER_OPTIONS: Array<{
  value: PnlResultFilterKey;
  label: string;
}> = [
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
        dateFrom: toIsoDate(
          new Date(reference.getFullYear(), reference.getMonth(), 1),
        ),
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

export function resolveReportPeriodRange(
  period: ReportPeriodKey,
  reference = new Date(),
): DateRange | null {
  if (period === "all") {
    return null;
  }

  const today = toIsoDate(reference);

  switch (period) {
    case "today":
      return { dateFrom: today, dateTo: today };
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
        dateFrom: toIsoDate(
          new Date(reference.getFullYear(), reference.getMonth(), 1),
        ),
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
    default:
      return { dateFrom: today, dateTo: today };
  }
}

export function isDateInRange(
  value: string | null | undefined,
  range: DateRange | null,
) {
  if (!range) {
    return true;
  }
  if (!value) {
    return false;
  }
  const day = value.slice(0, 10);
  return day >= range.dateFrom && day <= range.dateTo;
}
