import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FormAutocomplete,
  FormDropdown,
  FormField,
  FormInput,
} from "@/components/forms";
import type { FormDropdownOption } from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import { PdfPreviewModal } from "@/components/ui/PdfPreviewModal";
import { companyProfileService } from "@/services/companyProfileService";
import { inventoryMasterService } from "@/services/inventoryMasterService";
import { purchasesService } from "@/services/purchasesService";
import type { PurchaseLineResponse } from "@/types/purchases";
import {
  PURCHASE_SUMMARY_GROUP_BY_OPTIONS,
  SALES_PERIOD_OPTIONS,
  SALES_REPORT_VIEW_OPTIONS,
  FY_MONTH_LABELS,
  defaultCustomRange,
  emptyFyMonthQtys,
  fyMonthIndex,
  fyStartYearFromRange,
  isDateInRange,
  isFinancialYearPeriod,
  resolvePreviousPeriodRange,
  resolveSalesPeriodRange,
  visibleFyMonthCount,
  type DateRange,
  type PurchaseSummaryGroupByKey,
  type ReportViewKey,
  type SalesPeriodKey,
} from "@/utils/datePeriods";
import { createPurchasesReportPdfBlob } from "@/utils/purchasesReportPdf";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const rateFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return dateFormatter.format(date);
}

function formatNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

function formatRate(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return rateFormatter.format(value);
}

function formatText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function voucherKey(row: PurchaseLineResponse) {
  return `${row.voucher_date ?? ""}\0${row.voucher_no ?? ""}`;
}

function countLinesByVoucher(rows: PurchaseLineResponse[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = voucherKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

type PurchaseSummaryRow = {
  key: string;
  label: string;
  voucher_date: string | null;
  voucher_no: string | null;
  ledger_name: string | null;
  stock_item: string | null;
  stock_group: string | null;
  item_count: number;
  qty: number;
  value: number;
  monthQtys: number[];
  monthValues: number[];
};

/** Line value = qty × rate. */
function purchaseLineValue(row: PurchaseLineResponse) {
  return (row.qty ?? 0) * (row.rate ?? 0);
}

function QtyValueStack({
  qty,
  value,
}: {
  qty: number;
  value: number;
}) {
  return (
    <span className="app-table-metric-stack">
      <span>{qty ? formatNumber(qty) : "—"}</span>
      <span className="app-table-metric-stack__value">
        {value ? formatRate(value) : "—"}
      </span>
    </span>
  );
}

function pdfQtyValue(qty: number, value: number) {
  return `${qty ? formatNumber(qty) : "—"}\n${value ? formatRate(value) : "—"}`;
}

function companyAddressLine(profile: {
  address: string;
  area: string;
  city: string;
  pin: string;
}) {
  return [profile.address, profile.area, profile.city, profile.pin]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function resolveStockGroup(
  stockItem: string | null | undefined,
  stockGroupByItem: Map<string, string>,
): string {
  const key = stockItem?.trim().toLowerCase() ?? "";
  if (!key) {
    return "";
  }
  return stockGroupByItem.get(key)?.trim() ?? "";
}

function summarizePurchases(
  rows: PurchaseLineResponse[],
  groupBy: PurchaseSummaryGroupByKey,
  stockGroupByItem: Map<string, string>,
  fyStartYear: number | null,
): PurchaseSummaryRow[] {
  const groups = new Map<string, PurchaseSummaryRow>();

  for (const row of rows) {
    let key = "";
    let label = "";
    let stockGroup: string | null = null;
    let ledgerName: string | null = row.ledger_name;

    if (groupBy === "voucher") {
      key = voucherKey(row);
      label = row.voucher_no?.trim() || "—";
    } else if (groupBy === "supplier") {
      label = row.ledger_name?.trim() || "";
      key = label.toLowerCase() || "__blank__";
    } else if (groupBy === "stock_item") {
      label = row.stock_item?.trim() || "";
      key = label.toLowerCase() || "__blank__";
    } else if (groupBy === "stock_group_vendor") {
      stockGroup = resolveStockGroup(row.stock_item, stockGroupByItem) || null;
      const vendor = row.ledger_name?.trim() || "";
      ledgerName = vendor || null;
      const groupPart = stockGroup ?? "";
      key = `${groupPart.toLowerCase() || "__ungrouped__"}\0${vendor.toLowerCase() || "__blank__"}`;
      label = [groupPart || "—", vendor || "—"].join(" · ");
    } else {
      stockGroup = resolveStockGroup(row.stock_item, stockGroupByItem) || null;
      label = stockGroup ?? "";
      key = label.toLowerCase() || "__ungrouped__";
    }

    const qty = row.qty ?? 0;
    const value = purchaseLineValue(row);
    const monthIndex =
      fyStartYear === null
        ? null
        : fyMonthIndex(row.voucher_date, fyStartYear);

    const existing = groups.get(key);
    if (!existing) {
      const monthQtys = emptyFyMonthQtys();
      const monthValues = emptyFyMonthQtys();
      if (monthIndex !== null) {
        monthQtys[monthIndex] = qty;
        monthValues[monthIndex] = value;
      }
      groups.set(key, {
        key,
        label,
        voucher_date: row.voucher_date,
        voucher_no: row.voucher_no,
        ledger_name: ledgerName,
        stock_item: row.stock_item,
        stock_group: stockGroup,
        item_count: 1,
        qty,
        value,
        monthQtys,
        monthValues,
      });
      continue;
    }
    existing.item_count += 1;
    existing.qty += qty;
    existing.value += value;
    if (monthIndex !== null) {
      existing.monthQtys[monthIndex] += qty;
      existing.monthValues[monthIndex] += value;
    }
  }

  const result = Array.from(groups.values());
  if (groupBy === "voucher") {
    return result;
  }
  if (groupBy === "stock_group_vendor") {
    return result.sort((a, b) => {
      const groupCmp = (a.stock_group || "—").localeCompare(
        b.stock_group || "—",
        undefined,
        { sensitivity: "base" },
      );
      if (groupCmp !== 0) {
        return groupCmp;
      }
      return (a.ledger_name || "—").localeCompare(b.ledger_name || "—", undefined, {
        sensitivity: "base",
      });
    });
  }
  return result.sort((a, b) =>
    (a.label || "—").localeCompare(b.label || "—", undefined, {
      sensitivity: "base",
    }),
  );
}

function uniqueSortedOptions(
  rows: PurchaseLineResponse[],
  pick: (row: PurchaseLineResponse) => string | null | undefined,
  allLabel: string,
): FormDropdownOption[] {
  const values = new Set<string>();
  for (const row of rows) {
    const value = pick(row)?.trim();
    if (value) {
      values.add(value);
    }
  }
  return [
    { value: "", label: allLabel },
    ...Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
  ];
}

function PurchasesTableColgroup({
  summaryGroupBy,
  showCompare,
  monthLabels = [],
  showSupplierColumn = true,
}: {
  summaryGroupBy: PurchaseSummaryGroupByKey | null;
  showCompare?: boolean;
  monthLabels?: readonly string[];
  showSupplierColumn?: boolean;
}) {
  const showMonthly = monthLabels.length > 0;
  if (summaryGroupBy === "stock_group_vendor") {
    if (showMonthly) {
      return (
        <colgroup>
          <col style={{ width: "10rem" }} />
          {showSupplierColumn ? <col style={{ width: "12rem" }} /> : null}
          {monthLabels.map((label) => (
            <col key={label} className="sales-report-col-month" />
          ))}
          <col className="sales-report-col-month" />
        </colgroup>
      );
    }
    if (showCompare) {
      return (
        <colgroup>
          <col style={{ width: showSupplierColumn ? "35%" : "70%" }} />
          {showSupplierColumn ? <col style={{ width: "35%" }} /> : null}
          <col style={{ width: "15%" }} />
          <col style={{ width: "15%" }} />
        </colgroup>
      );
    }
    return (
      <colgroup>
        <col style={{ width: showSupplierColumn ? "40%" : "80%" }} />
        {showSupplierColumn ? <col style={{ width: "40%" }} /> : null}
        <col style={{ width: "20%" }} />
      </colgroup>
    );
  }
  if (summaryGroupBy && summaryGroupBy !== "voucher") {
    const showGroupLabel =
      summaryGroupBy !== "supplier" || showSupplierColumn;
    if (showMonthly) {
      return (
        <colgroup>
          {showGroupLabel ? <col style={{ width: "14rem" }} /> : null}
          {monthLabels.map((label) => (
            <col key={label} className="sales-report-col-month" />
          ))}
          <col className="sales-report-col-month" />
        </colgroup>
      );
    }
    if (showCompare) {
      return (
        <colgroup>
          {showGroupLabel ? <col style={{ width: "50%" }} /> : null}
          <col style={{ width: showGroupLabel ? "25%" : "50%" }} />
          <col style={{ width: showGroupLabel ? "25%" : "50%" }} />
        </colgroup>
      );
    }
    return (
      <colgroup>
        {showGroupLabel ? <col style={{ width: "70%" }} /> : null}
        <col style={{ width: showGroupLabel ? "30%" : "100%" }} />
      </colgroup>
    );
  }
  return (
    <colgroup>
      <col className="sales-report-col-date" />
      <col className="sales-report-col-voucher" />
      {showSupplierColumn ? <col className="sales-report-col-buyer" /> : null}
      <col className="sales-report-col-item" />
      <col className="sales-report-col-qty" />
      {showCompare ? <col className="sales-report-col-qty" /> : null}
      <col className="sales-report-col-rate" />
    </colgroup>
  );
}

function groupByFootNoun(groupBy: PurchaseSummaryGroupByKey, count: number) {
  const plural = count === 1 ? "" : "s";
  if (groupBy === "voucher") {
    return `${count} voucher${plural}`;
  }
  if (groupBy === "supplier") {
    return `${count} supplier${plural}`;
  }
  if (groupBy === "stock_item") {
    return `${count} stock item${plural}`;
  }
  if (groupBy === "stock_group_vendor") {
    return `${count} group / vendor${plural}`;
  }
  return `${count} stock group${plural}`;
}

export function PurchasesReportPage() {
  const [period, setPeriod] = useState<SalesPeriodKey>("this_month");
  const [customRange, setCustomRange] = useState<DateRange>(defaultCustomRange);
  const [view, setView] = useState<ReportViewKey>("details");
  const [groupBy, setGroupBy] =
    useState<PurchaseSummaryGroupByKey>("stock_group");
  const [monthlyBreakup, setMonthlyBreakup] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [stockItem, setStockItem] = useState("");
  const [stockGroup, setStockGroup] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  const purchasesQuery = useQuery({
    queryKey: ["purchases", "report"],
    queryFn: () => purchasesService.listPurchases(),
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory-master", "purchases-report"],
    queryFn: () => inventoryMasterService.list(),
  });

  const companyQuery = useQuery({
    queryKey: ["company-profile", "purchases-report-pdf"],
    queryFn: () => companyProfileService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const stockGroupByItem = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of inventoryQuery.data ?? []) {
      const key = item.stock_item?.trim().toLowerCase();
      const group = item.stock_group?.trim();
      if (key && group) {
        map.set(key, group);
      }
    }
    return map;
  }, [inventoryQuery.data]);

  const activeRange = useMemo(
    () => resolveSalesPeriodRange(period, customRange),
    [period, customRange],
  );

  const isFyPeriod = isFinancialYearPeriod(period);
  const fyStartYear = isFyPeriod ? fyStartYearFromRange(activeRange) : null;

  useEffect(() => {
    if (!isFyPeriod) {
      setMonthlyBreakup(false);
    }
  }, [isFyPeriod]);

  const compareRange = useMemo(() => {
    if (view !== "summary_previous_period") {
      return null;
    }
    return resolvePreviousPeriodRange(period, activeRange, customRange);
  }, [view, period, activeRange, customRange]);

  const periodRows = useMemo(
    () =>
      (purchasesQuery.data ?? []).filter((row) =>
        isDateInRange(row.voucher_date, activeRange),
      ),
    [purchasesQuery.data, activeRange],
  );

  const comparePeriodRows = useMemo(() => {
    if (!compareRange) {
      return [] as PurchaseLineResponse[];
    }
    return (purchasesQuery.data ?? []).filter((row) =>
      isDateInRange(row.voucher_date, compareRange),
    );
  }, [purchasesQuery.data, compareRange]);

  const supplierOptions = useMemo(
    () =>
      uniqueSortedOptions(
        periodRows,
        (row) => row.ledger_name,
        "All suppliers",
      ),
    [periodRows],
  );

  const stockGroupOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of periodRows) {
      const group = resolveStockGroup(row.stock_item, stockGroupByItem);
      if (group) {
        values.add(group);
      }
    }
    return [
      { value: "", label: "All stock groups" },
      ...Array.from(values)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    ];
  }, [periodRows, stockGroupByItem]);

  const stockItemOptions = useMemo(() => {
    const scoped = stockGroup
      ? periodRows.filter(
          (row) =>
            resolveStockGroup(row.stock_item, stockGroupByItem) === stockGroup,
        )
      : periodRows;
    return uniqueSortedOptions(
      scoped,
      (row) => row.stock_item,
      "All stock items",
    );
  }, [periodRows, stockGroup, stockGroupByItem]);

  const isSummary =
    view === "summary" || view === "summary_previous_period";
  const showCompare = view === "summary_previous_period" && !monthlyBreakup;
  const showMonthly =
    monthlyBreakup && isFyPeriod && isSummary && groupBy !== "voucher";
  const visibleMonths = useMemo(() => {
    if (!showMonthly || fyStartYear === null) {
      return [] as string[];
    }
    const count = visibleFyMonthCount(fyStartYear);
    return FY_MONTH_LABELS.slice(0, count);
  }, [showMonthly, fyStartYear]);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const footScrollRef = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);

  function syncHorizontalScroll(source: "body" | "foot") {
    if (syncingScroll.current) {
      return;
    }
    const body = tableScrollRef.current;
    const foot = footScrollRef.current;
    if (!body || !foot) {
      return;
    }
    syncingScroll.current = true;
    if (source === "body") {
      foot.scrollLeft = body.scrollLeft;
    } else {
      body.scrollLeft = foot.scrollLeft;
    }
    requestAnimationFrame(() => {
      syncingScroll.current = false;
    });
  }
  const supplierFilterEnabled =
    !isSummary ||
    groupBy === "voucher" ||
    groupBy === "supplier" ||
    groupBy === "stock_group_vendor";
  const stockGroupFilterEnabled =
    !isSummary ||
    groupBy === "voucher" ||
    groupBy === "stock_group" ||
    groupBy === "stock_group_vendor";
  const stockItemFilterEnabled =
    !isSummary || groupBy === "voucher" || groupBy === "stock_item";

  useEffect(() => {
    setSupplier("");
    setStockItem("");
    setStockGroup("");
  }, [period, customRange.dateFrom, customRange.dateTo]);

  useEffect(() => {
    if (!supplierFilterEnabled) {
      setSupplier("");
    }
    if (!stockGroupFilterEnabled) {
      setStockGroup("");
    }
    if (!stockItemFilterEnabled) {
      setStockItem("");
    }
  }, [supplierFilterEnabled, stockGroupFilterEnabled, stockItemFilterEnabled]);

  useEffect(() => {
    if (
      supplier &&
      !supplierOptions.some((option) => option.value === supplier)
    ) {
      setSupplier("");
    }
  }, [supplier, supplierOptions]);

  useEffect(() => {
    if (
      stockGroup &&
      !stockGroupOptions.some((option) => option.value === stockGroup)
    ) {
      setStockGroup("");
    }
  }, [stockGroup, stockGroupOptions]);

  useEffect(() => {
    if (
      stockItem &&
      !stockItemOptions.some((option) => option.value === stockItem)
    ) {
      setStockItem("");
    }
  }, [stockItem, stockItemOptions]);

  const filteredRows = useMemo(
    () =>
      periodRows.filter((row) => {
        if (
          supplierFilterEnabled &&
          supplier &&
          (row.ledger_name?.trim() ?? "") !== supplier
        ) {
          return false;
        }
        if (stockGroupFilterEnabled && stockGroup) {
          const group = resolveStockGroup(row.stock_item, stockGroupByItem);
          if (group !== stockGroup) {
            return false;
          }
        }
        if (
          stockItemFilterEnabled &&
          stockItem &&
          (row.stock_item?.trim() ?? "") !== stockItem
        ) {
          return false;
        }
        return true;
      }),
    [
      periodRows,
      supplier,
      stockItem,
      stockGroup,
      stockGroupByItem,
      supplierFilterEnabled,
      stockGroupFilterEnabled,
      stockItemFilterEnabled,
    ],
  );

  const filteredCompareRows = useMemo(() => {
    if (!compareRange) {
      return [] as PurchaseLineResponse[];
    }
    return comparePeriodRows.filter((row) => {
      if (
        supplierFilterEnabled &&
        supplier &&
        (row.ledger_name?.trim() ?? "") !== supplier
      ) {
        return false;
      }
      if (stockGroupFilterEnabled && stockGroup) {
        const group = resolveStockGroup(row.stock_item, stockGroupByItem);
        if (group !== stockGroup) {
          return false;
        }
      }
      if (
        stockItemFilterEnabled &&
        stockItem &&
        (row.stock_item?.trim() ?? "") !== stockItem
      ) {
        return false;
      }
      return true;
    });
  }, [
    compareRange,
    comparePeriodRows,
    supplier,
    stockItem,
    stockGroup,
    stockGroupByItem,
    supplierFilterEnabled,
    stockGroupFilterEnabled,
    stockItemFilterEnabled,
  ]);

  const displayRows = useMemo(() => {
    const linesByVoucher = countLinesByVoucher(filteredRows);
    const seenVouchers = new Set<string>();

    return filteredRows.map((row) => {
      const key = voucherKey(row);
      const isFirstInVoucher = !seenVouchers.has(key);
      if (isFirstInVoucher) {
        seenVouchers.add(key);
      }

      return {
        row,
        showVoucherHeader:
          (linesByVoucher.get(key) ?? 0) <= 1 || isFirstInVoucher,
      };
    });
  }, [filteredRows]);

  const summaryRows = useMemo(
    () => summarizePurchases(filteredRows, groupBy, stockGroupByItem, fyStartYear),
    [filteredRows, groupBy, stockGroupByItem, fyStartYear],
  );

  const compareSummaryRows = useMemo(() => {
    if (!compareRange || !showCompare) {
      return [] as PurchaseSummaryRow[];
    }
    return summarizePurchases(
      filteredCompareRows,
      groupBy,
      stockGroupByItem,
      null,
    );
  }, [
    compareRange,
    showCompare,
    filteredCompareRows,
    groupBy,
    stockGroupByItem,
  ]);

  const mergedSummaryRows = useMemo(() => {
    if (!isSummary) {
      return [] as Array<PurchaseSummaryRow & { compareQty: number }>;
    }
    const compareByKey = new Map(
      compareSummaryRows.map((row) => [row.key, row]),
    );
    const currentByKey = new Map(summaryRows.map((row) => [row.key, row]));
    const keys = new Set<string>([
      ...currentByKey.keys(),
      ...(showCompare ? compareByKey.keys() : []),
    ]);
    const merged: Array<PurchaseSummaryRow & { compareQty: number }> = [];
    for (const key of keys) {
      const current = currentByKey.get(key);
      const compare = compareByKey.get(key);
      if (current) {
        merged.push({
          ...current,
          compareQty: compare?.qty ?? 0,
        });
        continue;
      }
      if (compare) {
        merged.push({
          ...compare,
          qty: 0,
          value: 0,
          item_count: 0,
          monthQtys: emptyFyMonthQtys(),
          monthValues: emptyFyMonthQtys(),
          compareQty: compare.qty,
        });
      }
    }
    if (groupBy === "voucher") {
      return merged;
    }
    if (groupBy === "stock_group_vendor") {
      return merged.sort((a, b) => {
        const groupCmp = (a.stock_group || "—").localeCompare(
          b.stock_group || "—",
          undefined,
          { sensitivity: "base" },
        );
        if (groupCmp !== 0) {
          return groupCmp;
        }
        return (a.ledger_name || "—").localeCompare(
          b.ledger_name || "—",
          undefined,
          { sensitivity: "base" },
        );
      });
    }
    return merged.sort((a, b) =>
      (a.label || "—").localeCompare(b.label || "—", undefined, {
        sensitivity: "base",
      }),
    );
  }, [isSummary, groupBy, summaryRows, compareSummaryRows, showCompare]);

  const isGroupedSummary = isSummary && groupBy !== "voucher";
  const isGroupVendorSummary = isGroupedSummary && groupBy === "stock_group_vendor";
  /** Hide Supplier/Vendor column when a specific supplier is filtered. */
  const showSupplierColumn = !supplier;
  const showGroupLabelColumn =
    !isGroupedSummary ||
    groupBy !== "supplier" ||
    showSupplierColumn;
  const labelColCount = isGroupVendorSummary
    ? 1 + (showSupplierColumn ? 1 : 0)
    : isGroupedSummary
      ? showGroupLabelColumn
        ? 1
        : 0
      : showSupplierColumn
        ? 4
        : 3;
  const rowCount = isSummary ? mergedSummaryRows.length : displayRows.length;
  const totalQty = useMemo(
    () => filteredRows.reduce((sum, row) => sum + (row.qty ?? 0), 0),
    [filteredRows],
  );
  const totalValue = useMemo(
    () => filteredRows.reduce((sum, row) => sum + purchaseLineValue(row), 0),
    [filteredRows],
  );
  const totalCompareQty = useMemo(
    () =>
      showCompare
        ? filteredCompareRows.reduce((sum, row) => sum + (row.qty ?? 0), 0)
        : 0,
    [showCompare, filteredCompareRows],
  );
  const totalMonthQtys = useMemo(() => {
    if (!showMonthly || visibleMonths.length === 0) {
      return [] as number[];
    }
    const totals = Array.from({ length: visibleMonths.length }, () => 0);
    for (const row of mergedSummaryRows) {
      visibleMonths.forEach((_, index) => {
        totals[index] += row.monthQtys[index] ?? 0;
      });
    }
    return totals;
  }, [showMonthly, visibleMonths, mergedSummaryRows]);
  const totalMonthValues = useMemo(() => {
    if (!showMonthly || visibleMonths.length === 0) {
      return [] as number[];
    }
    const totals = Array.from({ length: visibleMonths.length }, () => 0);
    for (const row of mergedSummaryRows) {
      visibleMonths.forEach((_, index) => {
        totals[index] += row.monthValues[index] ?? 0;
      });
    }
    return totals;
  }, [showMonthly, visibleMonths, mergedSummaryRows]);

  const filtersDisabled =
    purchasesQuery.isLoading || inventoryQuery.isLoading;

  const footLabel = purchasesQuery.isLoading
    ? "Loading…"
    : purchasesQuery.isError
      ? "—"
      : isSummary
        ? groupByFootNoun(groupBy, rowCount)
        : `${rowCount} line${rowCount === 1 ? "" : "s"}`;

  const groupColumnLabel =
    groupBy === "supplier"
      ? "Supplier"
      : groupBy === "stock_item"
        ? "Stock item"
        : "Stock group";

  const closePdfPreview = useCallback(() => {
    setPdfPreview((current) => {
      if (current?.url) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
    setExportingPdf(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) {
        URL.revokeObjectURL(pdfPreview.url);
      }
    };
  }, [pdfPreview?.url]);

  async function handleExportPdf() {
    if (rowCount === 0 || purchasesQuery.isLoading || purchasesQuery.isError) {
      return;
    }
    setPdfError(null);
    closePdfPreview();
    setExportingPdf(true);
    setPdfPreview({ url: "", fileName: "" });
    try {
      let company = companyQuery.data;
      if (!company) {
        company = await companyProfileService.getProfile();
      }

      const periodLabel =
        SALES_PERIOD_OPTIONS.find((option) => option.value === period)?.label ??
        period;
      const viewLabel =
        SALES_REPORT_VIEW_OPTIONS.find((option) => option.value === view)
          ?.label ?? view;
      const groupByLabel = isSummary
        ? (PURCHASE_SUMMARY_GROUP_BY_OPTIONS.find(
            (option) => option.value === groupBy,
          )?.label ?? groupBy)
        : null;

      let head: string[] = [];
      let body: string[][] = [];
      let foot: string[] = [];
      let numericColumnIndexes: number[] = [];

      if (isGroupVendorSummary) {
        head = [
          "Stock group",
          ...(showSupplierColumn ? ["Vendor"] : []),
          ...visibleMonths,
          showMonthly ? "Total" : "Qty",
          ...(showCompare ? ["Compare qty"] : []),
        ];
        body = mergedSummaryRows.map((row) => [
          formatText(row.stock_group),
          ...(showSupplierColumn ? [formatText(row.ledger_name)] : []),
          ...visibleMonths.map((_, index) =>
            pdfQtyValue(row.monthQtys[index] ?? 0, row.monthValues[index] ?? 0),
          ),
          pdfQtyValue(row.qty, row.value),
          ...(showCompare ? [formatNumber(row.compareQty)] : []),
        ]);
        foot = [
          footLabel,
          ...(showSupplierColumn ? [""] : []),
          ...visibleMonths.map((_, index) =>
            pdfQtyValue(totalMonthQtys[index] ?? 0, totalMonthValues[index] ?? 0),
          ),
          pdfQtyValue(totalQty, totalValue),
          ...(showCompare ? [formatNumber(totalCompareQty)] : []),
        ];
        numericColumnIndexes = Array.from(
          { length: head.length - (showSupplierColumn ? 2 : 1) },
          (_, index) => index + (showSupplierColumn ? 2 : 1),
        );
      } else if (isGroupedSummary) {
        head = [
          ...(showGroupLabelColumn ? [groupColumnLabel] : []),
          ...visibleMonths,
          showMonthly ? "Total" : "Qty",
          ...(showCompare ? ["Compare qty"] : []),
        ];
        body = mergedSummaryRows.map((row) => [
          ...(showGroupLabelColumn ? [formatText(row.label)] : []),
          ...visibleMonths.map((_, index) =>
            pdfQtyValue(row.monthQtys[index] ?? 0, row.monthValues[index] ?? 0),
          ),
          pdfQtyValue(row.qty, row.value),
          ...(showCompare ? [formatNumber(row.compareQty)] : []),
        ]);
        foot = [
          ...(showGroupLabelColumn ? [footLabel] : []),
          ...visibleMonths.map((_, index) =>
            pdfQtyValue(totalMonthQtys[index] ?? 0, totalMonthValues[index] ?? 0),
          ),
          pdfQtyValue(totalQty, totalValue),
          ...(showCompare ? [formatNumber(totalCompareQty)] : []),
        ];
        if (!showGroupLabelColumn && foot.length > 0) {
          foot[0] = `${footLabel}\n${foot[0]}`;
        }
        numericColumnIndexes = Array.from(
          { length: head.length - (showGroupLabelColumn ? 1 : 0) },
          (_, index) => index + (showGroupLabelColumn ? 1 : 0),
        );
      } else if (isSummary) {
        head = [
          "Date",
          "Voucher",
          ...(showSupplierColumn ? ["Supplier"] : []),
          "Items",
          "Qty",
          ...(showCompare ? ["Compare qty"] : []),
          "Rate",
        ];
        body = mergedSummaryRows.map((row) => [
          formatDate(row.voucher_date),
          formatText(row.voucher_no),
          ...(showSupplierColumn ? [formatText(row.ledger_name)] : []),
          formatNumber(row.item_count),
          pdfQtyValue(row.qty, row.value),
          ...(showCompare ? [formatNumber(row.compareQty)] : []),
          "—",
        ]);
        foot = [
          footLabel,
          "",
          ...(showSupplierColumn ? [""] : []),
          "",
          pdfQtyValue(totalQty, totalValue),
          ...(showCompare ? [formatNumber(totalCompareQty)] : []),
          "—",
        ];
        const qtyIndex = showSupplierColumn ? 4 : 3;
        numericColumnIndexes = showCompare
          ? [qtyIndex - 1, qtyIndex, qtyIndex + 1, qtyIndex + 2]
          : [qtyIndex - 1, qtyIndex, qtyIndex + 1];
      } else {
        head = [
          "Date",
          "Voucher",
          ...(showSupplierColumn ? ["Supplier"] : []),
          "Stock item",
          "Qty",
          "Rate",
        ];
        body = displayRows.map(({ row, showVoucherHeader }) => [
          formatDate(row.voucher_date),
          showVoucherHeader ? formatText(row.voucher_no) : "",
          ...(showSupplierColumn
            ? [showVoucherHeader ? formatText(row.ledger_name) : ""]
            : []),
          formatText(row.stock_item),
          formatNumber(row.qty),
          formatRate(row.rate),
        ]);
        foot = [
          footLabel,
          "",
          ...(showSupplierColumn ? [""] : []),
          "",
          formatNumber(totalQty),
          "—",
        ];
        const qtyIndex = showSupplierColumn ? 4 : 3;
        numericColumnIndexes = [qtyIndex, qtyIndex + 1];
      }

      const { blob, fileName } = createPurchasesReportPdfBlob(
        {
          companyName: company.companyName,
          companyAddress: companyAddressLine(company),
          companyGstin: company.gstin,
          periodLabel,
          dateFrom: activeRange.dateFrom,
          dateTo: activeRange.dateTo,
          viewLabel,
          groupByLabel,
          monthlyBreakup: showMonthly,
          supplier: supplier || undefined,
          stockGroup: stockGroup || undefined,
          stockItem: stockItem || undefined,
        },
        { head, body, foot, numericColumnIndexes },
      );
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, fileName });
    } catch (error) {
      closePdfPreview();
      setPdfError(
        error instanceof Error
          ? error.message
          : "Failed to export PDF. Please try again.",
      );
    } finally {
      setExportingPdf(false);
    }
  }

  function handleDownloadPdf() {
    if (!pdfPreview?.url || !pdfPreview.fileName) {
      return;
    }
    const link = document.createElement("a");
    link.href = pdfPreview.url;
    link.download = pdfPreview.fileName;
    link.click();
  }

  return (
    <section className="report-page">
      <PageHeader
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Reports" },
          { label: "Purchases" },
        ]}
      />

      <div
        className={[
          "report-page__toolbar mt-1",
          isFyPeriod || (isSummary && groupBy !== "voucher")
            ? "report-page__toolbar--cols-4"
            : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <FormField label="Period">
          <FormDropdown
            className="report-page__period"
            listClassName="report-page__period-list"
            options={SALES_PERIOD_OPTIONS}
            value={period}
            onChange={(value) => setPeriod(value as SalesPeriodKey)}
            disabled={filtersDisabled}
          />
        </FormField>
        {period === "custom" ? (
          <>
            <FormField label="From" className="report-page__custom-date">
              <FormInput
                type="date"
                value={customRange.dateFrom}
                disabled={filtersDisabled}
                onChange={(event) =>
                  setCustomRange((current) => ({
                    ...current,
                    dateFrom: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="To" className="report-page__custom-date">
              <FormInput
                type="date"
                value={customRange.dateTo}
                disabled={filtersDisabled}
                onChange={(event) =>
                  setCustomRange((current) => ({
                    ...current,
                    dateTo: event.target.value,
                  }))
                }
              />
            </FormField>
          </>
        ) : null}
        <FormField label="View">
          <FormDropdown
            className="report-page__period"
            listClassName="report-page__period-list"
            options={SALES_REPORT_VIEW_OPTIONS}
            value={view}
            onChange={(value) => setView(value as ReportViewKey)}
            disabled={filtersDisabled}
          />
        </FormField>
        {isSummary ? (
          <FormField label="Group by">
            <FormDropdown
              className="report-page__period"
              listClassName="report-page__period-list"
              options={PURCHASE_SUMMARY_GROUP_BY_OPTIONS}
              value={groupBy}
              onChange={(value) =>
                setGroupBy(value as PurchaseSummaryGroupByKey)
              }
              disabled={filtersDisabled}
            />
          </FormField>
        ) : null}
        {isFyPeriod ? (
          <FormField label="Monthly breakup" className="report-page__monthly-breakup">
            <div className="default-win-form__control report-page__checkbox-control">
              <input
                type="checkbox"
                className="report-page__checkbox-input"
                checked={monthlyBreakup}
                disabled={filtersDisabled || !isSummary || groupBy === "voucher"}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                aria-label="Monthly breakup"
                onChange={(event) => setMonthlyBreakup(event.target.checked)}
              />
              <span className="report-page__checkbox-text">
                {filtersDisabled || !isSummary || groupBy === "voucher"
                  ? "Summary only"
                  : "Apr–Mar columns"}
              </span>
            </div>
          </FormField>
        ) : null}
        {supplierFilterEnabled ? (
          <FormField label="Supplier" className="report-page__filter-search">
            <FormAutocomplete
              options={supplierOptions}
              value={supplier}
              onChange={setSupplier}
              disabled={filtersDisabled}
              placeholder="All suppliers"
              emptyMessage="No suppliers in this period"
            />
          </FormField>
        ) : null}
        {stockGroupFilterEnabled ? (
          <FormField label="Stock group" className="report-page__filter-search">
            <FormAutocomplete
              options={stockGroupOptions}
              value={stockGroup}
              onChange={setStockGroup}
              disabled={filtersDisabled}
              placeholder="All stock groups"
              emptyMessage="No stock groups in this period"
            />
          </FormField>
        ) : null}
        {stockItemFilterEnabled ? (
          <FormField label="Stock item" className="report-page__filter-search">
            <FormAutocomplete
              options={stockItemOptions}
              value={stockItem}
              onChange={setStockItem}
              disabled={filtersDisabled}
              placeholder="All stock items"
              emptyMessage="No stock items in this period"
            />
          </FormField>
        ) : null}
      </div>

      <div className="report-page__actions mt-3">
        <button
          type="button"
          className="default-win-form__button"
          disabled={
            exportingPdf ||
            filtersDisabled ||
            purchasesQuery.isError ||
            rowCount === 0
          }
          onClick={() => void handleExportPdf()}
        >
          <DocumentArrowDownIcon
            className="default-win-form__button-icon"
            aria-hidden="true"
          />
          {exportingPdf ? "Preparing…" : "Export PDF"}
        </button>
        {pdfError ? (
          <p className="report-page__export-error" role="alert">
            {pdfError}
          </p>
        ) : null}
      </div>

      <PdfPreviewModal
        open={exportingPdf || Boolean(pdfPreview)}
        title="Purchases report PDF"
        fileName={pdfPreview?.fileName}
        pdfUrl={pdfPreview?.url}
        loading={exportingPdf || !pdfPreview?.url}
        onClose={closePdfPreview}
        onDownload={handleDownloadPdf}
      />

      <div className="app-table-wrap report-page__table mt-4">
        <div className="app-table-shell">
          <div
            ref={tableScrollRef}
            className={[
              "app-table-scroll",
              showMonthly ? "app-table-scroll--monthly" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            onScroll={
              showMonthly ? () => syncHorizontalScroll("body") : undefined
            }
          >
            {purchasesQuery.isLoading || inventoryQuery.isLoading ? (
              <p className="app-table-empty">Loading purchases…</p>
            ) : purchasesQuery.isError ? (
              <p
                className="app-table-empty text-[var(--color-danger)]"
                role="alert"
              >
                {(purchasesQuery.error as Error).message}
              </p>
            ) : (
              <table
                className={[
                  "app-table",
                  "app-table--sales-report",
                  showMonthly ? "app-table--monthly-breakup" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <PurchasesTableColgroup
                  summaryGroupBy={isSummary ? groupBy : null}
                  showCompare={showCompare}
                  monthLabels={visibleMonths}
                  showSupplierColumn={showSupplierColumn}
                />
                <thead>
                  {isGroupVendorSummary ? (
                    <tr>
                      <th>Stock group</th>
                      {showSupplierColumn ? <th>Vendor</th> : null}
                      {visibleMonths.map((label) => (
                        <th key={label} className="app-table-num">
                          {label}
                        </th>
                      ))}
                      <th className="app-table-num">
                        <span className="app-table-metric-stack">
                          <span>{showMonthly ? "Total" : "Qty"}</span>
                          <span className="app-table-metric-stack__value">
                            Value
                          </span>
                        </span>
                      </th>
                      {showCompare ? (
                        <th className="app-table-num">Compare qty</th>
                      ) : null}
                    </tr>
                  ) : isGroupedSummary ? (
                    <tr>
                      {showGroupLabelColumn ? (
                        <th>{groupColumnLabel}</th>
                      ) : null}
                      {visibleMonths.map((label) => (
                        <th key={label} className="app-table-num">
                          {label}
                        </th>
                      ))}
                      <th className="app-table-num">
                        <span className="app-table-metric-stack">
                          <span>{showMonthly ? "Total" : "Qty"}</span>
                          <span className="app-table-metric-stack__value">
                            Value
                          </span>
                        </span>
                      </th>
                      {showCompare ? (
                        <th className="app-table-num">Compare qty</th>
                      ) : null}
                    </tr>
                  ) : (
                    <tr>
                      <th>Date</th>
                      <th>Voucher</th>
                      {showSupplierColumn ? <th>Supplier</th> : null}
                      <th className={isSummary ? "app-table-num" : undefined}>
                        {isSummary ? "Items" : "Stock item"}
                      </th>
                      <th className="app-table-num">Qty</th>
                      {showCompare ? (
                        <th className="app-table-num">Compare qty</th>
                      ) : null}
                      <th className="app-table-num">Rate</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rowCount === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          isGroupVendorSummary
                            ? labelColCount +
                              (showMonthly
                                ? visibleMonths.length + 1
                                : showCompare
                                  ? 2
                                  : 1)
                            : isGroupedSummary
                              ? labelColCount +
                                (showMonthly
                                  ? visibleMonths.length + 1
                                  : showCompare
                                    ? 2
                                    : 1)
                              : labelColCount + (showCompare ? 3 : 2)
                        }
                        className="app-table-empty"
                      >
                        No purchases found for this period.
                      </td>
                    </tr>
                  ) : isGroupVendorSummary ? (
                    mergedSummaryRows.map((row) => (
                      <tr key={row.key}>
                        <td title={row.stock_group?.trim() || undefined}>
                          {formatText(row.stock_group)}
                        </td>
                        {showSupplierColumn ? (
                          <td title={row.ledger_name?.trim() || undefined}>
                            {formatText(row.ledger_name)}
                          </td>
                        ) : null}
                        {visibleMonths.map((label, index) => (
                          <td key={label} className="app-table-num">
                            <QtyValueStack
                              qty={row.monthQtys[index] ?? 0}
                              value={row.monthValues[index] ?? 0}
                            />
                          </td>
                        ))}
                        <td className="app-table-num">
                          <QtyValueStack qty={row.qty} value={row.value} />
                        </td>
                        {showCompare ? (
                          <td className="app-table-num">
                            {formatNumber(row.compareQty)}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  ) : isGroupedSummary ? (
                    mergedSummaryRows.map((row) => (
                      <tr key={row.key}>
                        {showGroupLabelColumn ? (
                          <td title={row.label || undefined}>
                            {formatText(row.label)}
                          </td>
                        ) : null}
                        {visibleMonths.map((label, index) => (
                          <td key={label} className="app-table-num">
                            <QtyValueStack
                              qty={row.monthQtys[index] ?? 0}
                              value={row.monthValues[index] ?? 0}
                            />
                          </td>
                        ))}
                        <td className="app-table-num">
                          <QtyValueStack qty={row.qty} value={row.value} />
                        </td>
                        {showCompare ? (
                          <td className="app-table-num">
                            {formatNumber(row.compareQty)}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  ) : isSummary ? (
                    mergedSummaryRows.map((row) => (
                      <tr key={row.key}>
                        <td>{formatDate(row.voucher_date)}</td>
                        <td>{formatText(row.voucher_no)}</td>
                        {showSupplierColumn ? (
                          <td title={row.ledger_name?.trim() || undefined}>
                            {formatText(row.ledger_name)}
                          </td>
                        ) : null}
                        <td className="app-table-num">
                          {formatNumber(row.item_count)}
                        </td>
                        <td className="app-table-num">
                          <QtyValueStack qty={row.qty} value={row.value} />
                        </td>
                        {showCompare ? (
                          <td className="app-table-num">
                            {formatNumber(row.compareQty)}
                          </td>
                        ) : null}
                        <td className="app-table-num">—</td>
                      </tr>
                    ))
                  ) : (
                    displayRows.map(({ row, showVoucherHeader }) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.voucher_date)}</td>
                        <td>
                          {showVoucherHeader ? formatText(row.voucher_no) : ""}
                        </td>
                        {showSupplierColumn ? (
                          <td
                            title={
                              showVoucherHeader
                                ? row.ledger_name?.trim() || undefined
                                : undefined
                            }
                          >
                            {showVoucherHeader
                              ? formatText(row.ledger_name)
                              : ""}
                          </td>
                        ) : null}
                        <td title={row.stock_item?.trim() || undefined}>
                          {formatText(row.stock_item)}
                        </td>
                        <td className="app-table-num">
                          {formatNumber(row.qty)}
                        </td>
                        <td className="app-table-num">
                          {formatRate(row.rate)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div
            ref={footScrollRef}
            className={[
              "app-table-foot",
              "app-table-foot--aligned",
              showMonthly ? "app-table-foot--monthly" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            onScroll={
              showMonthly ? () => syncHorizontalScroll("foot") : undefined
            }
          >
            <table
              className={[
                "app-table",
                "app-table--sales-report",
                showMonthly ? "app-table--monthly-breakup" : null,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <PurchasesTableColgroup
                summaryGroupBy={isSummary ? groupBy : null}
                showCompare={showCompare}
                monthLabels={visibleMonths}
                showSupplierColumn={showSupplierColumn}
              />
              <tbody>
                <tr>
                  {labelColCount > 0 ? (
                    <td colSpan={labelColCount}>
                      <span className="app-table-foot-label">{footLabel}</span>
                    </td>
                  ) : null}
                  {showMonthly
                    ? totalMonthQtys.map((qty, index) => (
                        <td
                          key={visibleMonths[index]}
                          className="app-table-num"
                        >
                          {!purchasesQuery.isLoading && !purchasesQuery.isError ? (
                            <QtyValueStack
                              qty={qty}
                              value={totalMonthValues[index] ?? 0}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                      ))
                    : null}
                  <td className="app-table-num">
                    {!purchasesQuery.isLoading && !purchasesQuery.isError ? (
                      labelColCount === 0 ? (
                        <span className="app-table-metric-stack">
                          <span className="app-table-foot-label">
                            {footLabel}
                          </span>
                          {isGroupedSummary || isSummary ? (
                            <>
                              <span>
                                {totalQty ? formatNumber(totalQty) : "—"}
                              </span>
                              <span className="app-table-metric-stack__value">
                                {totalValue ? formatRate(totalValue) : "—"}
                              </span>
                            </>
                          ) : (
                            <span>{formatNumber(totalQty)}</span>
                          )}
                        </span>
                      ) : isGroupedSummary || isSummary ? (
                        <QtyValueStack qty={totalQty} value={totalValue} />
                      ) : (
                        formatNumber(totalQty)
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  {showCompare ? (
                    <td className="app-table-num">
                      {!purchasesQuery.isLoading && !purchasesQuery.isError
                        ? formatNumber(totalCompareQty)
                        : "—"}
                    </td>
                  ) : null}
                  {isGroupedSummary ? null : <td />}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
