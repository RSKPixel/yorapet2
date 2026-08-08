import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  FormAutocomplete,
  FormDropdown,
  FormField,
} from "@/components/forms";
import type { FormDropdownOption } from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import { stockSummaryService } from "@/services/stockSummaryService";
import type { StockSummaryItem } from "@/types/stockSummary";

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

function todayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAsOnLabel(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return dateFormatter.format(date);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return rateFormatter.format(value);
}

function formatText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function uniqueOptions(
  values: Array<string | null | undefined>,
  allLabel: string,
): FormDropdownOption[] {
  const unique = new Set(
    values
      .map((value) => value?.trim() ?? "")
      .filter(Boolean),
  );
  return [
    { value: "", label: allLabel },
    ...Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
  ];
}

function StockSummaryColgroup() {
  return (
    <colgroup>
      <col />
      <col className="sales-report-col-buyer" />
      <col className="sales-report-col-qty" />
      <col className="sales-report-col-rate" />
    </colgroup>
  );
}

export function StockSummaryPage() {
  const asOn = todayIso();
  const [stockGroup, setStockGroup] = useState("");
  const [stockItem, setStockItem] = useState("");

  const summaryQuery = useQuery({
    queryKey: ["stock-summary", asOn],
    queryFn: () => stockSummaryService.getSummary({ asOn }),
  });

  const rows = summaryQuery.data?.items ?? [];

  const stockGroupOptions = useMemo(
    () => uniqueOptions(rows.map((row) => row.stock_group), "All groups"),
    [rows],
  );

  const stockItemOptions = useMemo(() => {
    const scoped = stockGroup
      ? rows.filter((row) => (row.stock_group?.trim() ?? "") === stockGroup)
      : rows;
    return uniqueOptions(
      scoped.map((row) => row.stock_item),
      "All stock items",
    );
  }, [rows, stockGroup]);

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
      rows.filter((row) => {
        if (stockGroup && (row.stock_group?.trim() ?? "") !== stockGroup) {
          return false;
        }
        if (stockItem && row.stock_item.trim() !== stockItem) {
          return false;
        }
        return true;
      }),
    [rows, stockGroup, stockItem],
  );

  const rowCount = filteredRows.length;
  const totalClosing = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.closing_qty, 0),
    [filteredRows],
  );

  return (
    <section className="report-page">
      <PageHeader
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Reports" },
          { label: "Stock Summary" },
        ]}
      />

      <div className="report-page__toolbar mt-1">
        <FormField label="As on" className="report-page__custom-date">
          <div className="default-win-form__control report-page__as-on-readonly">
            {formatAsOnLabel(asOn)}
          </div>
        </FormField>
        <FormField label="Stock group">
          <FormDropdown
            className="report-page__period"
            listClassName="report-page__period-list"
            options={stockGroupOptions}
            value={stockGroup}
            onChange={(value) => {
              setStockGroup(value);
              setStockItem("");
            }}
            disabled={summaryQuery.isLoading}
            placeholder="All groups"
            emptyMessage="No stock groups as on this date"
          />
        </FormField>
        <FormField label="Stock item" className="report-page__filter-search">
          <FormAutocomplete
            options={stockItemOptions}
            value={stockItem}
            onChange={setStockItem}
            disabled={summaryQuery.isLoading}
            placeholder="All stock items"
            emptyMessage="No stock items as on this date"
          />
        </FormField>
      </div>

      <div className="app-table-wrap report-page__table mt-4">
        <div className="app-table-shell">
          <div className="app-table-scroll">
            {summaryQuery.isLoading ? (
              <p className="app-table-empty">Loading stock summary…</p>
            ) : summaryQuery.isError ? (
              <p
                className="app-table-empty text-[var(--color-danger)]"
                role="alert"
              >
                {(summaryQuery.error as Error).message}
              </p>
            ) : (
              <table className="app-table app-table--sales-report">
                <StockSummaryColgroup />
                <thead>
                  <tr>
                    <th>Stock item</th>
                    <th>Group</th>
                    <th className="app-table-num">Closing</th>
                    <th className="app-table-num">Closing rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rowCount === 0 ? (
                    <tr>
                      <td colSpan={4} className="app-table-empty">
                        No stock movements found as on this date.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row: StockSummaryItem) => (
                      <tr key={row.stock_item}>
                        <td title={row.stock_item}>{row.stock_item}</td>
                        <td title={row.stock_group?.trim() || undefined}>
                          {formatText(row.stock_group)}
                        </td>
                        <td className="app-table-num">
                          {formatNumber(row.closing_qty)}
                        </td>
                        <td className="app-table-num">
                          {formatRate(row.closing_rate)}
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
              <StockSummaryColgroup />
              <tbody>
                <tr>
                  <td colSpan={2}>
                    <span className="app-table-foot-label">
                      {summaryQuery.isLoading
                        ? "Loading…"
                        : summaryQuery.isError
                          ? "—"
                          : `${rowCount} item${rowCount === 1 ? "" : "s"}`}
                    </span>
                  </td>
                  <td className="app-table-num">
                    {!summaryQuery.isLoading && !summaryQuery.isError
                      ? formatNumber(totalClosing)
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
