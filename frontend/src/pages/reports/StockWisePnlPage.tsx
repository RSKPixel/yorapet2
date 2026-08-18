import { useQuery } from "@tanstack/react-query";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FormDropdown, FormField, FormMultiSelect } from "@/components/forms";
import type { FormDropdownOption } from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import { PdfPreviewModal } from "@/components/ui/PdfPreviewModal";
import { companyProfileService } from "@/services/companyProfileService";
import { stockPnlService } from "@/services/stockPnlService";
import type { StockPnlItem } from "@/types/stockPnl";
import { createStockWisePnlPdfBlob } from "@/utils/stockWisePnlPdf";
import {
  PNL_RESULT_FILTER_OPTIONS,
  STOCK_PNL_PERIOD_OPTIONS,
  resolveStockPnlPeriodRange,
  type PnlResultFilterKey,
  type StockPnlPeriodKey,
} from "@/utils/datePeriods";

const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const rateFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

function pnlClass(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) {
    return "";
  }
  return value < 0 ? "app-table-num--negative" : "app-table-num--positive";
}

function matchesPnlResultFilter(row: StockPnlItem, filter: PnlResultFilterKey) {
  switch (filter) {
    case "profits":
      return row.pnl_amount !== null && row.pnl_amount > 0;
    case "losses":
      return row.pnl_amount !== null && row.pnl_amount < 0;
    default:
      return true;
  }
}

function countPnlResultFilter(rows: StockPnlItem[], filter: PnlResultFilterKey) {
  return rows.filter((row) => matchesPnlResultFilter(row, filter)).length;
}

function uniqueGroupOptions(
  values: Array<string | null | undefined>,
  allLabel: string,
): FormDropdownOption[] {
  const unique = new Set(values.map((value) => value?.trim() ?? "").filter(Boolean));
  return [
    { value: "", label: allLabel },
    ...Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
  ];
}

function stockItemOptionsFromRows(rows: StockPnlItem[]): FormDropdownOption[] {
  const unique = new Set(
    rows.map((row) => row.stock_item?.trim() ?? "").filter(Boolean),
  );
  return Array.from(unique)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
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

function StockPnlColgroup() {
  return (
    <colgroup>
      <col />
      <col style={{ width: "14%" }} />
      <col className="sales-report-col-rate" />
      <col className="sales-report-col-rate" />
      <col className="sales-report-col-qty" />
      <col className="sales-report-col-rate" />
      <col className="sales-report-col-rate" />
      <col className="sales-report-col-gutter" />
    </colgroup>
  );
}

export function StockWisePnlPage() {
  const [period, setPeriod] = useState<StockPnlPeriodKey>("all");
  const [resultFilter, setResultFilter] = useState<PnlResultFilterKey>("all");
  const [stockGroup, setStockGroup] = useState("");
  const [stockItems, setStockItems] = useState<string[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  const periodRange = useMemo(() => resolveStockPnlPeriodRange(period), [period]);

  const companyQuery = useQuery({
    queryKey: ["company-profile", "stock-pnl-pdf"],
    queryFn: () => companyProfileService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const pnlQuery = useQuery({
    queryKey: [
      "stock-pnl",
      periodRange?.dateFrom ?? "all",
      periodRange?.dateTo ?? "all",
    ],
    queryFn: () =>
      stockPnlService.getPnl(
        periodRange
          ? { dateFrom: periodRange.dateFrom, dateTo: periodRange.dateTo }
          : {},
      ),
  });

  const rows = pnlQuery.data?.items ?? [];

  const stockGroupOptions = useMemo(
    () =>
      uniqueGroupOptions(
        rows.map((row) => row.stock_group),
        "All groups",
      ),
    [rows],
  );

  const stockItemOptions = useMemo(() => {
    const scoped = stockGroup
      ? rows.filter((row) => (row.stock_group?.trim() ?? "") === stockGroup)
      : rows;
    return stockItemOptionsFromRows(scoped);
  }, [rows, stockGroup]);

  const scopedRows = useMemo(
    () =>
      rows.filter((row) => {
        if (row.sell_qty <= 0) {
          return false;
        }
        if (stockGroup && (row.stock_group?.trim() ?? "") !== stockGroup) {
          return false;
        }
        if (stockItems.length > 0 && !stockItems.includes(row.stock_item.trim())) {
          return false;
        }
        return true;
      }),
    [rows, stockGroup, stockItems],
  );

  const resultFilterCounts = useMemo(
    () => ({
      profits: countPnlResultFilter(scopedRows, "profits"),
      losses: countPnlResultFilter(scopedRows, "losses"),
    }),
    [scopedRows],
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
    setStockItems((current) => current.filter((item) => allowed.has(item)));
  }, [stockItemOptions]);

  useEffect(() => {
    if (resultFilter === "all") {
      return;
    }
    if (resultFilterCounts[resultFilter] === 0) {
      setResultFilter("all");
    }
  }, [resultFilter, resultFilterCounts]);

  const filteredRows = useMemo(
    () => scopedRows.filter((row) => matchesPnlResultFilter(row, resultFilter)),
    [scopedRows, resultFilter],
  );

  const rowCount = filteredRows.length;
  const totalSellQty = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.sell_qty, 0),
    [filteredRows],
  );
  const totalPnl = useMemo(
    () =>
      filteredRows.reduce((sum, row) => {
        if (row.pnl_amount === null || row.pnl_amount === undefined) {
          return sum;
        }
        return sum + row.pnl_amount;
      }, 0),
    [filteredRows],
  );

  const periodHint =
    period === "all"
      ? "all sales"
      : periodRange
        ? `${periodRange.dateFrom} to ${periodRange.dateTo}`
        : "selected period";

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
    if (rowCount === 0 || pnlQuery.isLoading || pnlQuery.isError) {
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
        STOCK_PNL_PERIOD_OPTIONS.find((option) => option.value === period)?.label ??
        period;
      const showLabel =
        resultFilter === "profits"
          ? "Profits"
          : resultFilter === "losses"
            ? "Losses"
            : "Items with sales";

      const body = filteredRows.map((row) => [
        row.stock_item,
        formatText(row.stock_group),
        formatRate(row.cost_price),
        formatRate(row.avg_sell_price),
        formatNumber(row.sell_qty),
        formatRate(row.pnl_amount),
      ]);

      const footLabel = `${rowCount} item${rowCount === 1 ? "" : "s"}`;
      const foot = [
        footLabel,
        "",
        "",
        "",
        formatNumber(totalSellQty),
        formatRate(totalPnl),
      ];

      const { blob, fileName } = createStockWisePnlPdfBlob(
        {
          companyName: company.companyName,
          companyAddress: companyAddressLine(company),
          companyGstin: company.gstin,
          periodLabel,
          dateFrom: periodRange?.dateFrom,
          dateTo: periodRange?.dateTo,
          showLabel,
          stockGroup: stockGroup || undefined,
          stockItems:
            stockItems.length > 0 ? stockItems.join(", ") : undefined,
        },
        {
          head: [
            "Stock item",
            "Group",
            "Cost price",
            "Avg sell",
            "Sell qty",
            "P&L",
          ],
          body,
          foot,
          numericColumnIndexes: [2, 3, 4, 5],
        },
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
          { label: "Stock Wise P&L" },
        ]}
      />

      <p className="report-page__hint mt-1 text-sm text-[var(--color-muted)]">
        Shows stock items with sales only. P&L uses closing cost price, average sell
        price, and sell qty for {periodHint}.
      </p>

      <div className="report-page__toolbar mt-2">
        <FormField label="Sales period">
          <FormDropdown
            className="report-page__period"
            listClassName="report-page__period-list"
            options={STOCK_PNL_PERIOD_OPTIONS}
            value={period}
            onChange={(value) => setPeriod(value as StockPnlPeriodKey)}
            disabled={pnlQuery.isLoading}
            placeholder="All sales"
            emptyMessage="No periods"
          />
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
            disabled={pnlQuery.isLoading}
            placeholder="All groups"
            emptyMessage="No stock groups"
          />
        </FormField>
        <FormField label="Stock item" className="report-page__filter-search">
          <FormMultiSelect
            options={stockItemOptions}
            value={stockItems}
            onChange={setStockItems}
            disabled={pnlQuery.isLoading}
            placeholder="All stock items"
            emptyMessage="No stock items"
            listClassName="report-page__filter-list"
          />
        </FormField>
      </div>

      <div className="report-page__toolbar mt-2">
        <FormField label="Show">
          <div className="report-page__stock-item-row">
            {PNL_RESULT_FILTER_OPTIONS.map((option) => {
                const count =
                  option.value === "profits"
                    ? resultFilterCounts.profits
                    : resultFilterCounts.losses;
                if (count <= 0) {
                  return null;
                }
                const active = resultFilter === option.value;
                const toneClass =
                  option.value === "profits"
                    ? "stock-pnl-filter-badge--profit"
                    : "stock-pnl-filter-badge--loss";
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      "stock-pnl-filter-badge",
                      toneClass,
                      active ? "is-filled" : "is-outline",
                    ].join(" ")}
                    aria-pressed={active}
                    title={active ? "Clear filter" : option.label}
                    onClick={() =>
                      setResultFilter((current) =>
                        current === option.value ? "all" : option.value,
                      )
                    }
                  >
                    {option.label}
                    <span className="stock-pnl-filter-badge__count">{count}</span>
                  </button>
                );
              })}
          </div>
        </FormField>
      </div>

      <div className="report-page__actions mt-3">
        <button
          type="button"
          className="default-win-form__button"
          disabled={
            exportingPdf || pnlQuery.isLoading || pnlQuery.isError || rowCount === 0
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
        title="Stock Wise P&L PDF"
        fileName={pdfPreview?.fileName}
        pdfUrl={pdfPreview?.url}
        loading={exportingPdf || !pdfPreview?.url}
        onClose={closePdfPreview}
        onDownload={handleDownloadPdf}
      />

      <div className="app-table-wrap report-page__table mt-4">
        <div className="app-table-shell">
          <div className="app-table-scroll">
            {pnlQuery.isLoading ? (
              <p className="app-table-empty">Loading stock P&L…</p>
            ) : pnlQuery.isError ? (
              <p className="app-table-empty text-[var(--color-danger)]" role="alert">
                {(pnlQuery.error as Error).message}
              </p>
            ) : (
              <table className="app-table app-table--sales-report app-table--stock-pnl">
                <StockPnlColgroup />
                <thead>
                  <tr>
                    <th>Stock item</th>
                    <th>Group</th>
                    <th className="app-table-num">Cost price</th>
                    <th className="app-table-num">Avg sell</th>
                    <th className="app-table-num">Sell qty</th>
                    <th className="app-table-num">Profit/unit</th>
                    <th className="app-table-num">P&L</th>
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {rowCount === 0 ? (
                    <tr>
                      <td colSpan={8} className="app-table-empty">
                        {resultFilter !== "all"
                          ? "No items match the selected filters."
                          : "No stock items with sales in this period."}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row: StockPnlItem) => (
                      <tr key={row.stock_item}>
                        <td title={row.stock_item}>{row.stock_item}</td>
                        <td title={row.stock_group?.trim() || undefined}>
                          {formatText(row.stock_group)}
                        </td>
                        <td className="app-table-num">
                          {formatRate(row.cost_price)}
                        </td>
                        <td className="app-table-num">
                          {formatRate(row.avg_sell_price)}
                        </td>
                        <td className="app-table-num">
                          {formatNumber(row.sell_qty)}
                        </td>
                        <td
                          className={[
                            "app-table-num",
                            pnlClass(row.profit_per_unit),
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {formatRate(row.profit_per_unit)}
                        </td>
                        <td
                          className={["app-table-num", pnlClass(row.pnl_amount)]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {formatRate(row.pnl_amount)}
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
            <table className="app-table app-table--sales-report app-table--stock-pnl">
              <StockPnlColgroup />
              <tbody>
                <tr>
                  <td>
                    <span className="app-table-foot-label">
                      {pnlQuery.isLoading
                        ? "Loading…"
                        : pnlQuery.isError
                          ? "—"
                          : `${rowCount} item${rowCount === 1 ? "" : "s"}${
                              (resultFilter !== "all" || stockGroup || stockItems.length > 0) &&
                              scopedRows.length > 0
                                ? ` / ${scopedRows.length}`
                                : ""
                            }`}
                    </span>
                  </td>
                  <td />
                  <td />
                  <td />
                  <td className="app-table-num">
                    {!pnlQuery.isLoading && !pnlQuery.isError
                      ? formatNumber(totalSellQty)
                      : "—"}
                  </td>
                  <td />
                  <td
                    className={["app-table-num", pnlClass(totalPnl)]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {!pnlQuery.isLoading && !pnlQuery.isError
                      ? formatRate(totalPnl)
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
