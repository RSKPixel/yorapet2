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
import { purchasesService } from "@/services/purchasesService";
import type { PurchaseLineResponse } from "@/types/purchases";
import {
  PURCHASE_SUMMARY_GROUP_BY_OPTIONS,
  SALES_PERIOD_OPTIONS,
  SALES_REPORT_VIEW_OPTIONS,
  defaultCustomRange,
  isDateInRange,
  resolvePreviousPeriodRange,
  resolveSalesPeriodRange,
  type DateRange,
  type PurchaseSummaryGroupByKey,
  type ReportViewKey,
  type SalesPeriodKey,
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

function summarizePurchases(
  rows: PurchaseLineResponse[],
  groupBy: PurchaseSummaryGroupByKey,
  stockGroupByItem: Map<string, string>,
): PurchaseSummaryRow[] {
  const groups = new Map<string, PurchaseSummaryRow>();

  for (const row of rows) {
    let key = "";
    let label = "";
    let stockGroup: string | null = null;

    if (groupBy === "voucher") {
      key = voucherKey(row);
      label = row.voucher_no?.trim() || "—";
    } else if (groupBy === "supplier") {
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
}: {
  summaryGroupBy: PurchaseSummaryGroupByKey | null;
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
  return `${count} stock group${plural}`;
}

export function PurchasesReportPage() {
  const [period, setPeriod] = useState<SalesPeriodKey>("this_month");
  const [customRange, setCustomRange] = useState<DateRange>(defaultCustomRange);
  const [view, setView] = useState<ReportViewKey>("details");
  const [groupBy, setGroupBy] =
    useState<PurchaseSummaryGroupByKey>("stock_group");
  const [supplier, setSupplier] = useState("");
  const [stockItem, setStockItem] = useState("");
  const [stockGroup, setStockGroup] = useState("");

  const purchasesQuery = useQuery({
    queryKey: ["purchases", "report"],
    queryFn: () => purchasesService.listPurchases(),
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory-master", "purchases-report"],
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
  const showCompare = view === "summary_previous_period";
  const supplierFilterEnabled =
    !isSummary || groupBy === "voucher" || groupBy === "supplier";
  const stockGroupFilterEnabled =
    !isSummary || groupBy === "voucher" || groupBy === "stock_group";
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
    () => summarizePurchases(filteredRows, groupBy, stockGroupByItem),
    [filteredRows, groupBy, stockGroupByItem],
  );

  const compareSummaryRows = useMemo(() => {
    if (!compareRange || !showCompare) {
      return [] as PurchaseSummaryRow[];
    }
    return summarizePurchases(filteredCompareRows, groupBy, stockGroupByItem);
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
              options={PURCHASE_SUMMARY_GROUP_BY_OPTIONS}
              value={groupBy}
              onChange={(value) =>
                setGroupBy(value as PurchaseSummaryGroupByKey)
              }
              disabled={filtersDisabled}
            />
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

      <div className="app-table-wrap report-page__table mt-4">
        <div className="app-table-shell">
          <div className="app-table-scroll">
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
              <table className="app-table app-table--sales-report">
                <PurchasesTableColgroup
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
                      <th>Supplier</th>
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
                        No purchases found for this period.
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
              <PurchasesTableColgroup
                summaryGroupBy={isSummary ? groupBy : null}
                showCompare={showCompare}
              />
              <tbody>
                <tr>
                  <td colSpan={isGroupedSummary ? 1 : 4}>
                    <span className="app-table-foot-label">{footLabel}</span>
                  </td>
                  <td className="app-table-num">
                    {!purchasesQuery.isLoading && !purchasesQuery.isError
                      ? formatNumber(totalQty)
                      : "—"}
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
