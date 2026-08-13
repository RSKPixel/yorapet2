import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  FormDropdown,
  FormField,
  FormMultiSelect,
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

function uniqueGroupOptions(
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

function stockItemOptionsFromRows(rows: StockSummaryItem[]): FormDropdownOption[] {
  const unique = new Set(
    rows
      .map((row) => row.stock_item?.trim() ?? "")
      .filter(Boolean),
  );
  return Array.from(unique)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function StockSummaryColgroup() {
  return (
    <colgroup>
      <col />
      <col style={{ width: "18%" }} />
      <col className="sales-report-col-qty" />
      <col className="sales-report-col-rate" />
      <col className="sales-report-col-rate" />
      {/* Trailing gutter so Value is not :last-child (scrollbar / last-col padding). */}
      <col className="sales-report-col-gutter" />
    </colgroup>
  );
}

export function StockSummaryPage() {
  const asOn = todayIso();
  const [belowReorderOnly, setBelowReorderOnly] = useState(false);
  const [stockGroup, setStockGroup] = useState("");
  const [stockItems, setStockItems] = useState<string[]>([]);

  const summaryQuery = useQuery({
    queryKey: ["stock-summary", asOn],
    queryFn: () => stockSummaryService.getSummary({ asOn }),
  });

  const rows = summaryQuery.data?.items ?? [];

  const stockGroupOptions = useMemo(
    () => uniqueGroupOptions(rows.map((row) => row.stock_group), "All groups"),
    [rows],
  );

  const stockItemOptions = useMemo(() => {
    const scoped = stockGroup
      ? rows.filter((row) => (row.stock_group?.trim() ?? "") === stockGroup)
      : rows;
    return stockItemOptionsFromRows(scoped);
  }, [rows, stockGroup]);

  const belowReorderCount = useMemo(
    () => rows.filter((row) => row.below_reorder).length,
    [rows],
  );

  useEffect(() => {
    if (
      stockGroup &&
      !stockGroupOptions.some((option) => option.value === stockGroup)
    ) {
      setStockGroup("");
    }
  }, [stockGroup, stockGroupOptions]);

  useEffect(() => {
    const allowed = new Set(stockItemOptions.map((option) => option.value));
    setStockItems((current) =>
      current.filter((item) => allowed.has(item)),
    );
  }, [stockItemOptions]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (belowReorderOnly && !row.below_reorder) {
          return false;
        }
        if (stockGroup && (row.stock_group?.trim() ?? "") !== stockGroup) {
          return false;
        }
        if (
          stockItems.length > 0 &&
          !stockItems.includes(row.stock_item.trim())
        ) {
          return false;
        }
        return true;
      }),
    [rows, belowReorderOnly, stockGroup, stockItems],
  );

  const rowCount = filteredRows.length;
  const totalClosing = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.closing_qty, 0),
    [filteredRows],
  );
  const totalClosingValue = useMemo(
    () =>
      filteredRows.reduce((sum, row) => sum + (row.closing_value ?? 0), 0),
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
              setStockItems([]);
            }}
            disabled={summaryQuery.isLoading}
            placeholder="All groups"
            emptyMessage="No stock groups as on this date"
          />
        </FormField>
        <FormField label="Stock item" className="report-page__filter-search">
          <div className="report-page__stock-item-row">
            <FormMultiSelect
              options={stockItemOptions}
              value={stockItems}
              onChange={setStockItems}
              disabled={summaryQuery.isLoading}
              placeholder="All stock items"
              emptyMessage="No stock items as on this date"
              listClassName="report-page__filter-list"
            />
            {belowReorderCount > 0 ? (
              <button
                type="button"
                className={[
                  "stock-summary-reorder-badge",
                  "stock-summary-reorder-badge--filter",
                  belowReorderOnly
                    ? "is-filled"
                    : "is-outline",
                ].join(" ")}
                aria-pressed={belowReorderOnly}
                title={
                  belowReorderOnly
                    ? "Clear reorder filter"
                    : "Show reorder items only"
                }
                onClick={() => setBelowReorderOnly((current) => !current)}
              >
                Reorder
                <span className="stock-summary-reorder-badge__count">
                  {belowReorderCount}
                </span>
              </button>
            ) : null}
          </div>
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
              <table className="app-table app-table--sales-report app-table--stock-summary">
                <StockSummaryColgroup />
                <thead>
                  <tr>
                    <th>Stock item</th>
                    <th>Group</th>
                    <th className="app-table-num">Closing</th>
                    <th className="app-table-num">Cost price</th>
                    <th className="app-table-num">Value</th>
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {rowCount === 0 ? (
                    <tr>
                      <td colSpan={6} className="app-table-empty">
                        {belowReorderOnly
                          ? "No reorder items match the selected filters."
                          : "No stock movements found as on this date."}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row: StockSummaryItem) => (
                      <tr
                        key={row.stock_item}
                        className={
                          row.below_reorder
                            ? "app-table-row--reorder"
                            : undefined
                        }
                      >
                        <td title={row.stock_item}>
                          <span className="stock-summary-item-cell">
                            <span className="stock-summary-item-name">
                              {row.stock_item}
                            </span>
                            {row.below_reorder ? (
                              <span
                                className="stock-summary-reorder-badge is-filled"
                                title="Below 30-day reorder level"
                              >
                                Reorder
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td title={row.stock_group?.trim() || undefined}>
                          {formatText(row.stock_group)}
                        </td>
                        <td
                          className={[
                            "app-table-num",
                            row.below_reorder
                              ? "app-table-num--reorder"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {formatNumber(row.closing_qty)}
                        </td>
                        <td className="app-table-num">
                          {formatRate(row.closing_rate)}
                        </td>
                        <td className="app-table-num">
                          {formatRate(row.closing_value)}
                        </td>
                        <td aria-hidden="true" />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="app-table-foot app-table-foot--aligned">
            <table className="app-table app-table--sales-report app-table--stock-summary">
              <StockSummaryColgroup />
              <tbody>
                <tr>
                  <td>
                    <span className="app-table-foot-label">
                      {summaryQuery.isLoading
                        ? "Loading…"
                        : summaryQuery.isError
                          ? "—"
                          : `${rowCount} item${rowCount === 1 ? "" : "s"}${
                              belowReorderOnly && rows.length > 0
                                ? ` / ${rows.length}`
                                : ""
                            }`}
                    </span>
                  </td>
                  <td />
                  <td className="app-table-num">
                    {!summaryQuery.isLoading && !summaryQuery.isError
                      ? formatNumber(totalClosing)
                      : "—"}
                  </td>
                  <td />
                  <td className="app-table-num">
                    {!summaryQuery.isLoading && !summaryQuery.isError
                      ? formatRate(totalClosingValue)
                      : "—"}
                  </td>
                  <td aria-hidden="true" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
