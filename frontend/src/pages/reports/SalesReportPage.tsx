import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  FormAutocomplete,
  FormDropdown,
  FormField,
  FormInput,
} from "@/components/forms";
import type { FormDropdownOption } from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import { inventoryMasterService } from "@/services/inventoryMasterService";
import { salesService } from "@/services/salesService";
import type { SaleLineResponse } from "@/types/sales";
import {
  SALES_PERIOD_OPTIONS,
  SALES_REPORT_VIEW_OPTIONS,
  SALES_SUMMARY_GROUP_BY_OPTIONS,
  defaultCustomRange,
  isDateInRange,
  resolvePreviousPeriodRange,
  resolveSalesPeriodRange,
  type DateRange,
  type ReportViewKey,
  type SalesPeriodKey,
  type SalesSummaryGroupByKey,
} from "@/utils/datePeriods";

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

function voucherKey(row: SaleLineResponse) {
  return `${row.voucher_date ?? ""}\0${row.voucher_no ?? ""}`;
}

function countLinesByVoucher(rows: SaleLineResponse[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = voucherKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

type SaleSummaryRow = {
  key: string;
  label: string;
  voucher_date: string | null;
  voucher_no: string | null;
  ledger_name: string | null;
  stock_item: string | null;
  stock_group: string | null;
  item_count: number;
  qty: number;
};

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

function summarizeSales(
  rows: SaleLineResponse[],
  groupBy: SalesSummaryGroupByKey,
  stockGroupByItem: Map<string, string>,
): SaleSummaryRow[] {
  const groups = new Map<string, SaleSummaryRow>();

  for (const row of rows) {
    let key = "";
    let label = "";
    let stockGroup: string | null = null;

    if (groupBy === "voucher") {
      key = voucherKey(row);
      label = row.voucher_no?.trim() || "—";
    } else if (groupBy === "buyer") {
      label = row.ledger_name?.trim() || "";
      key = label.toLowerCase() || "__blank__";
    } else if (groupBy === "stock_item") {
      label = row.stock_item?.trim() || "";
      key = label.toLowerCase() || "__blank__";
    } else {
      stockGroup = resolveStockGroup(row.stock_item, stockGroupByItem) || null;
      label = stockGroup ?? "";
      key = label.toLowerCase() || "__ungrouped__";
    }

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        label,
        voucher_date: row.voucher_date,
        voucher_no: row.voucher_no,
        ledger_name: row.ledger_name,
        stock_item: row.stock_item,
        stock_group: stockGroup,
        item_count: 1,
        qty: row.qty ?? 0,
      });
      continue;
    }
    existing.item_count += 1;
    existing.qty += row.qty ?? 0;
  }

  const result = Array.from(groups.values());
  if (groupBy === "voucher") {
    return result;
  }
  return result.sort((a, b) =>
    (a.label || "—").localeCompare(b.label || "—", undefined, {
      sensitivity: "base",
    }),
  );
}

function uniqueSortedOptions(
  rows: SaleLineResponse[],
  pick: (row: SaleLineResponse) => string | null | undefined,
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

function SalesTableColgroup({
  summaryGroupBy,
  showCompare,
}: {
  summaryGroupBy: SalesSummaryGroupByKey | null;
  showCompare?: boolean;
}) {
  if (summaryGroupBy && summaryGroupBy !== "voucher") {
    if (showCompare) {
      return (
        <colgroup>
          <col style={{ width: "50%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
      );
    }
    return (
      <colgroup>
        <col style={{ width: "70%" }} />
        <col style={{ width: "30%" }} />
      </colgroup>
    );
  }
  return (
    <colgroup>
      <col className="sales-report-col-date" />
      <col className="sales-report-col-voucher" />
      <col className="sales-report-col-buyer" />
      <col className="sales-report-col-item" />
      <col className="sales-report-col-qty" />
      {showCompare ? <col className="sales-report-col-qty" /> : null}
      <col className="sales-report-col-rate" />
    </colgroup>
  );
}

function groupByFootNoun(groupBy: SalesSummaryGroupByKey, count: number) {
  const plural = count === 1 ? "" : "s";
  if (groupBy === "voucher") {
    return `${count} voucher${plural}`;
  }
  if (groupBy === "buyer") {
    return `${count} buyer${plural}`;
  }
  if (groupBy === "stock_item") {
    return `${count} stock item${plural}`;
  }
  return `${count} stock group${plural}`;
}

export function SalesReportPage() {
  const [period, setPeriod] = useState<SalesPeriodKey>("this_month");
  const [customRange, setCustomRange] = useState<DateRange>(defaultCustomRange);
  const [view, setView] = useState<ReportViewKey>("details");
  const [groupBy, setGroupBy] = useState<SalesSummaryGroupByKey>("stock_group");
  const [buyer, setBuyer] = useState("");
  const [stockItem, setStockItem] = useState("");
  const [stockGroup, setStockGroup] = useState("");

  const salesQuery = useQuery({
    queryKey: ["sales", "report"],
    queryFn: () => salesService.listSales(),
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory-master", "sales-report"],
    queryFn: () => inventoryMasterService.list(),
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

  const compareRange = useMemo(() => {
    if (view !== "summary_previous_period") {
      return null;
    }
    return resolvePreviousPeriodRange(period, activeRange, customRange);
  }, [view, period, activeRange, customRange]);

  const periodRows = useMemo(
    () =>
      (salesQuery.data ?? []).filter((row) =>
        isDateInRange(row.voucher_date, activeRange),
      ),
    [salesQuery.data, activeRange],
  );

  const comparePeriodRows = useMemo(() => {
    if (!compareRange) {
      return [] as SaleLineResponse[];
    }
    return (salesQuery.data ?? []).filter((row) =>
      isDateInRange(row.voucher_date, compareRange),
    );
  }, [salesQuery.data, compareRange]);

  const buyerOptions = useMemo(
    () => uniqueSortedOptions(periodRows, (row) => row.ledger_name, "All buyers"),
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
  const showCompare = view === "summary_previous_period";
  // In summary, only the filter matching Group by stays enabled (all enabled for voucher / details).
  const buyerFilterEnabled =
    !isSummary || groupBy === "voucher" || groupBy === "buyer";
  const stockGroupFilterEnabled =
    !isSummary || groupBy === "voucher" || groupBy === "stock_group";
  const stockItemFilterEnabled =
    !isSummary || groupBy === "voucher" || groupBy === "stock_item";

  useEffect(() => {
    setBuyer("");
    setStockItem("");
    setStockGroup("");
  }, [period, customRange.dateFrom, customRange.dateTo]);

  useEffect(() => {
    if (!buyerFilterEnabled) {
      setBuyer("");
    }
    if (!stockGroupFilterEnabled) {
      setStockGroup("");
    }
    if (!stockItemFilterEnabled) {
      setStockItem("");
    }
  }, [buyerFilterEnabled, stockGroupFilterEnabled, stockItemFilterEnabled]);

  useEffect(() => {
    if (buyer && !buyerOptions.some((option) => option.value === buyer)) {
      setBuyer("");
    }
  }, [buyer, buyerOptions]);

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
          buyerFilterEnabled &&
          buyer &&
          (row.ledger_name?.trim() ?? "") !== buyer
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
      buyer,
      stockItem,
      stockGroup,
      stockGroupByItem,
      buyerFilterEnabled,
      stockGroupFilterEnabled,
      stockItemFilterEnabled,
    ],
  );

  const filteredCompareRows = useMemo(() => {
    if (!compareRange) {
      return [] as SaleLineResponse[];
    }
    return comparePeriodRows.filter((row) => {
      if (
        buyerFilterEnabled &&
        buyer &&
        (row.ledger_name?.trim() ?? "") !== buyer
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
    buyer,
    stockItem,
    stockGroup,
    stockGroupByItem,
    buyerFilterEnabled,
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
    () => summarizeSales(filteredRows, groupBy, stockGroupByItem),
    [filteredRows, groupBy, stockGroupByItem],
  );

  const compareSummaryRows = useMemo(() => {
    if (!compareRange || !showCompare) {
      return [] as SaleSummaryRow[];
    }
    return summarizeSales(filteredCompareRows, groupBy, stockGroupByItem);
  }, [
    compareRange,
    showCompare,
    filteredCompareRows,
    groupBy,
    stockGroupByItem,
  ]);

  const mergedSummaryRows = useMemo(() => {
    if (!isSummary) {
      return [] as Array<SaleSummaryRow & { compareQty: number }>;
    }
    const compareByKey = new Map(
      compareSummaryRows.map((row) => [row.key, row]),
    );
    const currentByKey = new Map(summaryRows.map((row) => [row.key, row]));
    const keys = new Set<string>([
      ...currentByKey.keys(),
      ...(showCompare ? compareByKey.keys() : []),
    ]);
    const merged: Array<SaleSummaryRow & { compareQty: number }> = [];
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
          item_count: 0,
          compareQty: compare.qty,
        });
      }
    }
    if (groupBy === "voucher") {
      return merged;
    }
    return merged.sort((a, b) =>
      (a.label || "—").localeCompare(b.label || "—", undefined, {
        sensitivity: "base",
      }),
    );
  }, [isSummary, groupBy, summaryRows, compareSummaryRows, showCompare]);

  const isGroupedSummary = isSummary && groupBy !== "voucher";
  const rowCount = isSummary ? mergedSummaryRows.length : displayRows.length;
  const totalQty = useMemo(
    () => filteredRows.reduce((sum, row) => sum + (row.qty ?? 0), 0),
    [filteredRows],
  );
  const totalCompareQty = useMemo(
    () =>
      showCompare
        ? filteredCompareRows.reduce((sum, row) => sum + (row.qty ?? 0), 0)
        : 0,
    [showCompare, filteredCompareRows],
  );

  const filtersDisabled = salesQuery.isLoading || inventoryQuery.isLoading;

  const footLabel = salesQuery.isLoading
    ? "Loading…"
    : salesQuery.isError
      ? "—"
      : isSummary
        ? groupByFootNoun(groupBy, rowCount)
        : `${rowCount} line${rowCount === 1 ? "" : "s"}`;

  const groupColumnLabel =
    groupBy === "buyer"
      ? "Buyer"
      : groupBy === "stock_item"
        ? "Stock item"
        : "Stock group";

  return (
    <section className="report-page">
      <PageHeader
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Reports" },
          { label: "Sales" },
        ]}
      />

      <div
        className={[
          "report-page__toolbar mt-1",
          isSummary && groupBy !== "voucher"
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
              options={SALES_SUMMARY_GROUP_BY_OPTIONS}
              value={groupBy}
              onChange={(value) =>
                setGroupBy(value as SalesSummaryGroupByKey)
              }
              disabled={filtersDisabled}
            />
          </FormField>
        ) : null}
        {buyerFilterEnabled ? (
          <FormField label="Buyer" className="report-page__filter-search">
            <FormAutocomplete
              options={buyerOptions}
              value={buyer}
              onChange={setBuyer}
              disabled={filtersDisabled}
              placeholder="All buyers"
              emptyMessage="No buyers in this period"
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

      <div className="app-table-wrap report-page__table mt-4">
        <div className="app-table-shell">
          <div className="app-table-scroll">
            {salesQuery.isLoading || inventoryQuery.isLoading ? (
              <p className="app-table-empty">Loading sales…</p>
            ) : salesQuery.isError ? (
              <p
                className="app-table-empty text-[var(--color-danger)]"
                role="alert"
              >
                {(salesQuery.error as Error).message}
              </p>
            ) : (
              <table className="app-table app-table--sales-report">
                <SalesTableColgroup
                  summaryGroupBy={isSummary ? groupBy : null}
                  showCompare={showCompare}
                />
                <thead>
                  {isGroupedSummary ? (
                    <tr>
                      <th>{groupColumnLabel}</th>
                      <th className="app-table-num">Qty</th>
                      {showCompare ? (
                        <th className="app-table-num">Compare qty</th>
                      ) : null}
                    </tr>
                  ) : (
                    <tr>
                      <th>Date</th>
                      <th>Voucher</th>
                      <th>Buyer</th>
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
                          isGroupedSummary
                            ? showCompare
                              ? 3
                              : 2
                            : showCompare
                              ? 7
                              : 6
                        }
                        className="app-table-empty"
                      >
                        No sales found for this period.
                      </td>
                    </tr>
                  ) : isGroupedSummary ? (
                    mergedSummaryRows.map((row) => (
                      <tr key={row.key}>
                        <td title={row.label || undefined}>
                          {formatText(row.label)}
                        </td>
                        <td className="app-table-num">
                          {formatNumber(row.qty)}
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
                        <td title={row.ledger_name?.trim() || undefined}>
                          {formatText(row.ledger_name)}
                        </td>
                        <td className="app-table-num">
                          {formatNumber(row.item_count)}
                        </td>
                        <td className="app-table-num">
                          {formatNumber(row.qty)}
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
          <div className="app-table-foot app-table-foot--aligned">
            <table className="app-table app-table--sales-report">
              <SalesTableColgroup
                summaryGroupBy={isSummary ? groupBy : null}
                showCompare={showCompare}
              />
              <tbody>
                <tr>
                  <td colSpan={isGroupedSummary ? 1 : 4}>
                    <span className="app-table-foot-label">{footLabel}</span>
                  </td>
                  <td className="app-table-num">
                    {!salesQuery.isLoading && !salesQuery.isError
                      ? formatNumber(totalQty)
                      : "—"}
                  </td>
                  {showCompare ? (
                    <td className="app-table-num">
                      {!salesQuery.isLoading && !salesQuery.isError
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
