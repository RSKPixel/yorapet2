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
import { purchasesService } from "@/services/purchasesService";
import type { PurchaseLineResponse } from "@/types/purchases";
import {
  REPORT_VIEW_OPTIONS,
  SALES_PERIOD_OPTIONS,
  defaultCustomRange,
  isDateInRange,
  resolveSalesPeriodRange,
  type DateRange,
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
  voucher_date: string | null;
  voucher_no: string | null;
  ledger_name: string | null;
  item_count: number;
  qty: number;
};

function summarizePurchasesByVoucher(
  rows: PurchaseLineResponse[],
): PurchaseSummaryRow[] {
  const groups = new Map<string, PurchaseSummaryRow>();
  for (const row of rows) {
    const key = voucherKey(row);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        voucher_date: row.voucher_date,
        voucher_no: row.voucher_no,
        ledger_name: row.ledger_name,
        item_count: 1,
        qty: row.qty ?? 0,
      });
      continue;
    }
    existing.item_count += 1;
    existing.qty += row.qty ?? 0;
  }
  return Array.from(groups.values());
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

function PurchasesTableColgroup() {
  return (
    <colgroup>
      <col className="sales-report-col-date" />
      <col className="sales-report-col-voucher" />
      <col className="sales-report-col-buyer" />
      <col className="sales-report-col-item" />
      <col className="sales-report-col-qty" />
      <col className="sales-report-col-rate" />
    </colgroup>
  );
}

export function PurchasesReportPage() {
  const [period, setPeriod] = useState<SalesPeriodKey>("this_month");
  const [customRange, setCustomRange] = useState<DateRange>(defaultCustomRange);
  const [view, setView] = useState<ReportViewKey>("details");
  const [supplier, setSupplier] = useState("");
  const [stockItem, setStockItem] = useState("");

  const purchasesQuery = useQuery({
    queryKey: ["purchases", "report"],
    queryFn: () => purchasesService.listPurchases(),
  });

  const activeRange = useMemo(
    () => resolveSalesPeriodRange(period, customRange),
    [period, customRange],
  );

  const periodRows = useMemo(
    () =>
      (purchasesQuery.data ?? []).filter((row) =>
        isDateInRange(row.voucher_date, activeRange),
      ),
    [purchasesQuery.data, activeRange],
  );

  const supplierOptions = useMemo(
    () =>
      uniqueSortedOptions(
        periodRows,
        (row) => row.ledger_name,
        "All suppliers",
      ),
    [periodRows],
  );

  const stockItemOptions = useMemo(
    () =>
      uniqueSortedOptions(
        periodRows,
        (row) => row.stock_item,
        "All stock items",
      ),
    [periodRows],
  );

  useEffect(() => {
    setSupplier("");
    setStockItem("");
  }, [period, customRange.dateFrom, customRange.dateTo]);

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
      stockItem &&
      !stockItemOptions.some((option) => option.value === stockItem)
    ) {
      setStockItem("");
    }
  }, [stockItem, stockItemOptions]);

  const filteredRows = useMemo(
    () =>
      periodRows.filter((row) => {
        if (supplier && (row.ledger_name?.trim() ?? "") !== supplier) {
          return false;
        }
        if (stockItem && (row.stock_item?.trim() ?? "") !== stockItem) {
          return false;
        }
        return true;
      }),
    [periodRows, supplier, stockItem],
  );

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
    () => summarizePurchasesByVoucher(filteredRows),
    [filteredRows],
  );

  const isSummary = view === "summary";
  const rowCount = isSummary ? summaryRows.length : displayRows.length;
  const totalQty = useMemo(
    () => filteredRows.reduce((sum, row) => sum + (row.qty ?? 0), 0),
    [filteredRows],
  );

  const filtersDisabled = purchasesQuery.isLoading;
  const footLabel = purchasesQuery.isLoading
    ? "Loading…"
    : purchasesQuery.isError
      ? "—"
      : isSummary
        ? `${rowCount} voucher${rowCount === 1 ? "" : "s"}`
        : `${rowCount} line${rowCount === 1 ? "" : "s"}`;

  return (
    <section className="report-page">
      <PageHeader
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Reports" },
          { label: "Purchases" },
        ]}
      />

      <div className="report-page__toolbar mt-1">
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
            options={REPORT_VIEW_OPTIONS}
            value={view}
            onChange={(value) => setView(value as ReportViewKey)}
            disabled={filtersDisabled}
          />
        </FormField>
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
      </div>

      <div className="app-table-wrap report-page__table mt-4">
        <div className="app-table-shell">
          <div className="app-table-scroll">
            {purchasesQuery.isLoading ? (
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
                <PurchasesTableColgroup />
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Voucher</th>
                    <th>Supplier</th>
                    <th className={isSummary ? "app-table-num" : undefined}>
                      {isSummary ? "Items" : "Stock item"}
                    </th>
                    <th className="app-table-num">Qty</th>
                    <th className="app-table-num">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rowCount === 0 ? (
                    <tr>
                      <td colSpan={6} className="app-table-empty">
                        No purchases found for this period.
                      </td>
                    </tr>
                  ) : isSummary ? (
                    summaryRows.map((row) => (
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
              <PurchasesTableColgroup />
              <tbody>
                <tr>
                  <td colSpan={4}>
                    <span className="app-table-foot-label">{footLabel}</span>
                  </td>
                  <td className="app-table-num">
                    {!purchasesQuery.isLoading && !purchasesQuery.isError
                      ? formatNumber(totalQty)
                      : "—"}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
