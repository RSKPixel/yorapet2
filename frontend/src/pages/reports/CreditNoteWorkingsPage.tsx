import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";

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
  createCreditNoteWorkingsPdfBlob,
  groupHeaderRow,
  type CreditNoteWorkingsPdfTable,
} from "@/utils/creditNoteWorkingsPdf";
import {
  SALES_PERIOD_OPTIONS,
  defaultCustomRange,
  isDateInRange,
  resolveSalesPeriodRange,
  type DateRange,
  type SalesPeriodKey,
} from "@/utils/datePeriods";

const COLUMN_COUNT = 6;

const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pctFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

function formatNumber(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "—";
  }
  return numberFormatter.format(value);
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return moneyFormatter.format(value);
}

function formatPctValue(pct: number | null) {
  if (pct === null || !Number.isFinite(pct)) {
    return "—";
  }
  return `${pctFormatter.format(pct)}%`;
}

function formatText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot < 0) {
    return cleaned;
  }
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

function formatDecimalDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "." || trimmed === "-") {
    return "0.00";
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) {
    return "0.00";
  }
  return num.toFixed(2);
}

function blockNonDecimalKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (
    event.key === "-" ||
    event.key === "+" ||
    event.key === "e" ||
    event.key === "E"
  ) {
    event.preventDefault();
    return;
  }
  const allowed = [
    "Backspace",
    "Delete",
    "Tab",
    "Escape",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];
  if (allowed.includes(event.key)) {
    return;
  }
  if (/^\d$/.test(event.key) || event.key === ".") {
    return;
  }
  event.preventDefault();
}

function defaultCreditNotePct(creditNote: number, purchaseValue: number) {
  if (!Number.isFinite(purchaseValue) || purchaseValue === 0) {
    return 0;
  }
  return (creditNote / purchaseValue) * 100;
}

function creditNoteFromPct(purchaseValue: number, pct: number) {
  return roundMoney(purchaseValue * (Math.max(0, pct) / 100));
}

function pctFromTotals(creditNote: number, purchaseValue: number) {
  if (!Number.isFinite(purchaseValue) || purchaseValue === 0) {
    return null;
  }
  return (creditNote / purchaseValue) * 100;
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

function monthKey(voucherDate: string | null | undefined) {
  const day = voucherDate?.slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return "";
  }
  return day.slice(0, 7);
}

function monthLabel(key: string) {
  if (!key) {
    return "—";
  }
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return key;
  }
  return monthLabelFormatter.format(date);
}

function pctRowKey(monthKeyValue: string, rowKey: string) {
  return `${monthKeyValue}\0${rowKey}`;
}

type StockGroupRow = {
  key: string;
  stockGroup: string;
  box: number;
  qty: number;
  purchaseValue: number;
  creditNote: number;
};

type MonthGroup = {
  key: string;
  label: string;
  rows: StockGroupRow[];
  box: number;
  qty: number;
  purchaseValue: number;
  creditNote: number;
};

function groupByMonthAndStockGroup(
  rows: PurchaseLineResponse[],
  stockGroupByItem: Map<string, string>,
): MonthGroup[] {
  const months = new Map<
    string,
    { group: MonthGroup; stockRows: Map<string, StockGroupRow> }
  >();

  for (const row of rows) {
    const month = monthKey(row.voucher_date) || "__none__";
    const stockGroup = resolveStockGroup(row.stock_item, stockGroupByItem);
    const stockKey = stockGroup.toLowerCase() || "__ungrouped__";
    const box = toNumber(row.box);
    const qty = toNumber(row.qty);
    const purchaseValue = toNumber(row.cost_value);
    const creditNote = toNumber(row.credit_note);

    let monthEntry = months.get(month);
    if (!monthEntry) {
      monthEntry = {
        group: {
          key: month,
          label: monthLabel(month === "__none__" ? "" : month),
          rows: [],
          box: 0,
          qty: 0,
          purchaseValue: 0,
          creditNote: 0,
        },
        stockRows: new Map(),
      };
      months.set(month, monthEntry);
    }

    monthEntry.group.box += box;
    monthEntry.group.qty += qty;
    monthEntry.group.purchaseValue += purchaseValue;
    monthEntry.group.creditNote += creditNote;

    const existing = monthEntry.stockRows.get(stockKey);
    if (!existing) {
      monthEntry.stockRows.set(stockKey, {
        key: stockKey,
        stockGroup: stockGroup || "—",
        box,
        qty,
        purchaseValue,
        creditNote,
      });
      continue;
    }
    existing.box += box;
    existing.qty += qty;
    existing.purchaseValue += purchaseValue;
    existing.creditNote += creditNote;
  }

  return Array.from(months.values())
    .map(({ group, stockRows }) => ({
      ...group,
      rows: Array.from(stockRows.values()).sort((a, b) =>
        a.stockGroup.localeCompare(b.stockGroup, undefined, {
          sensitivity: "base",
        }),
      ),
    }))
    .sort((a, b) => {
      if (a.key === "__none__") {
        return 1;
      }
      if (b.key === "__none__") {
        return -1;
      }
      return a.key.localeCompare(b.key);
    });
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

function CreditNoteWorkingsColgroup() {
  return (
    <colgroup>
      <col />
      <col className="cn-workings-col-box" />
      <col className="cn-workings-col-qty" />
      <col className="cn-workings-col-purchase" />
      <col className="cn-workings-col-pct" />
      <col className="cn-workings-col-credit" />
    </colgroup>
  );
}

export function CreditNoteWorkingsPage() {
  const [period, setPeriod] = useState<SalesPeriodKey>("current_fy");
  const [customRange, setCustomRange] = useState<DateRange>(defaultCustomRange);
  const [vendor, setVendor] = useState("");
  const [pctOverrides, setPctOverrides] = useState<Record<string, string>>({});
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
    queryKey: ["inventory-master", "credit-note-workings"],
    queryFn: () => inventoryMasterService.list(),
  });

  const companyQuery = useQuery({
    queryKey: ["company-profile", "credit-note-workings-pdf"],
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

  const periodRows = useMemo(
    () =>
      (purchasesQuery.data ?? []).filter((row) =>
        isDateInRange(row.voucher_date, activeRange),
      ),
    [purchasesQuery.data, activeRange],
  );

  const vendorOptions = useMemo(
    () => uniqueSortedOptions(periodRows, (row) => row.ledger_name, "All vendors"),
    [periodRows],
  );

  useEffect(() => {
    setVendor("");
    setPctOverrides({});
  }, [period, customRange.dateFrom, customRange.dateTo]);

  useEffect(() => {
    if (vendor && !vendorOptions.some((option) => option.value === vendor)) {
      setVendor("");
    }
  }, [vendor, vendorOptions]);

  useEffect(() => {
    setPctOverrides({});
  }, [vendor]);

  const filteredRows = useMemo(
    () =>
      periodRows.filter((row) => {
        if (vendor && (row.ledger_name?.trim() ?? "") !== vendor) {
          return false;
        }
        return true;
      }),
    [periodRows, vendor],
  );

  const monthGroups = useMemo(
    () => groupByMonthAndStockGroup(filteredRows, stockGroupByItem),
    [filteredRows, stockGroupByItem],
  );

  const liveMonthGroups = useMemo(
    () =>
      monthGroups.map((month) => {
        const rows = month.rows.map((row) => {
          const key = pctRowKey(month.key, row.key);
          const pct =
            key in pctOverrides
              ? toNumber(pctOverrides[key])
              : defaultCreditNotePct(row.creditNote, row.purchaseValue);
          return {
            ...row,
            pct,
            pctInput:
              pctOverrides[key] ??
              formatDecimalDisplay(String(defaultCreditNotePct(row.creditNote, row.purchaseValue))),
            creditNoteValue: creditNoteFromPct(row.purchaseValue, pct),
          };
        });
        const creditNoteValue = roundMoney(
          rows.reduce((sum, row) => sum + row.creditNoteValue, 0),
        );
        return {
          ...month,
          rows,
          creditNoteValue,
          pct: pctFromTotals(creditNoteValue, month.purchaseValue),
        };
      }),
    [monthGroups, pctOverrides],
  );

  const stockGroupRowCount = useMemo(
    () => liveMonthGroups.reduce((sum, month) => sum + month.rows.length, 0),
    [liveMonthGroups],
  );
  const monthCount = liveMonthGroups.length;
  const totalBox = useMemo(
    () => liveMonthGroups.reduce((sum, month) => sum + month.box, 0),
    [liveMonthGroups],
  );
  const totalQty = useMemo(
    () => liveMonthGroups.reduce((sum, month) => sum + month.qty, 0),
    [liveMonthGroups],
  );
  const totalPurchaseValue = useMemo(
    () => liveMonthGroups.reduce((sum, month) => sum + month.purchaseValue, 0),
    [liveMonthGroups],
  );
  const totalCreditNoteValue = useMemo(
    () =>
      roundMoney(
        liveMonthGroups.reduce((sum, month) => sum + month.creditNoteValue, 0),
      ),
    [liveMonthGroups],
  );
  const totalPct = pctFromTotals(totalCreditNoteValue, totalPurchaseValue);

  const filtersDisabled = purchasesQuery.isLoading || inventoryQuery.isLoading;
  const footLabel = purchasesQuery.isLoading || inventoryQuery.isLoading
    ? "Loading…"
    : purchasesQuery.isError || inventoryQuery.isError
      ? "—"
      : `${monthCount} month${monthCount === 1 ? "" : "s"} · ${stockGroupRowCount} stock group${stockGroupRowCount === 1 ? "" : "s"}`;

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
    if (
      stockGroupRowCount === 0 ||
      purchasesQuery.isLoading ||
      purchasesQuery.isError ||
      inventoryQuery.isLoading ||
      inventoryQuery.isError
    ) {
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

      const head = [
        "Stock group",
        "Box",
        "Qty",
        "Purchase value",
        "Credit note %",
        "Credit note value",
      ];
      const body: CreditNoteWorkingsPdfTable["body"] = [];
      const subtotalRowIndexes: number[] = [];
      for (const month of liveMonthGroups) {
        body.push(groupHeaderRow(month.label, month.rows.length, COLUMN_COUNT));
        for (const row of month.rows) {
          body.push([
            formatText(row.stockGroup),
            formatNumber(row.box),
            formatNumber(row.qty),
            formatMoney(row.purchaseValue),
            formatPctValue(row.pct),
            formatMoney(row.creditNoteValue),
          ]);
        }
        subtotalRowIndexes.push(body.length);
        body.push([
          "Subtotal",
          formatNumber(month.box),
          formatNumber(month.qty),
          formatMoney(month.purchaseValue),
          formatPctValue(month.pct),
          formatMoney(month.creditNoteValue),
        ]);
      }
      const foot = [
        footLabel,
        formatNumber(totalBox),
        formatNumber(totalQty),
        formatMoney(totalPurchaseValue),
        formatPctValue(totalPct),
        formatMoney(totalCreditNoteValue),
      ];

      const { blob, fileName } = createCreditNoteWorkingsPdfBlob(
        {
          companyName: company.companyName,
          companyAddress: companyAddressLine(company),
          companyGstin: company.gstin,
          periodLabel,
          dateFrom: activeRange.dateFrom,
          dateTo: activeRange.dateTo,
          vendor: vendor || undefined,
        },
        {
          head,
          body,
          foot,
          numericColumnIndexes: [1, 2, 3, 4, 5],
          subtotalRowIndexes,
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

  const isLoading = purchasesQuery.isLoading || inventoryQuery.isLoading;
  const loadError = purchasesQuery.isError
    ? (purchasesQuery.error as Error).message
    : inventoryQuery.isError
      ? (inventoryQuery.error as Error).message
      : null;

  return (
    <section className="report-page">
      <PageHeader
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Reports" },
          { label: "Credit Note Workings" },
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
        <FormField label="Vendor" className="report-page__filter-search">
          <FormAutocomplete
            options={vendorOptions}
            value={vendor}
            onChange={setVendor}
            disabled={filtersDisabled}
            placeholder="All vendors"
            emptyMessage="No vendors in this period"
          />
        </FormField>
      </div>

      <div className="report-page__actions mt-3">
        <button
          type="button"
          className="default-win-form__button"
          disabled={
            exportingPdf ||
            filtersDisabled ||
            Boolean(loadError) ||
            stockGroupRowCount === 0
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
        title="Credit Note Workings PDF"
        fileName={pdfPreview?.fileName}
        pdfUrl={pdfPreview?.url}
        loading={exportingPdf || !pdfPreview?.url}
        onClose={closePdfPreview}
        onDownload={handleDownloadPdf}
      />

      <div className="app-table-wrap report-page__table mt-4">
        <div className="app-table-shell">
          <div className="app-table-scroll">
            {isLoading ? (
              <p className="app-table-empty">Loading purchases…</p>
            ) : loadError ? (
              <p className="app-table-empty text-[var(--color-danger)]" role="alert">
                {loadError}
              </p>
            ) : (
              <table className="app-table app-table--sales-report app-table--credit-note-workings">
                <CreditNoteWorkingsColgroup />
                <thead>
                  <tr>
                    <th>Stock group</th>
                    <th className="app-table-num">Box</th>
                    <th className="app-table-num">Qty</th>
                    <th className="app-table-num">Purchase value</th>
                    <th className="app-table-num">Credit note %</th>
                    <th className="app-table-num">Credit note value</th>
                  </tr>
                </thead>
                <tbody>
                  {stockGroupRowCount === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_COUNT} className="app-table-empty">
                        No purchases found for this period.
                      </td>
                    </tr>
                  ) : (
                    liveMonthGroups.flatMap((month) => [
                      <tr key={`group-${month.key}`} className="app-table-group">
                        <td colSpan={COLUMN_COUNT}>
                          {month.label}
                          <span className="app-table-foot-label">
                            {` · ${month.rows.length} stock group${month.rows.length === 1 ? "" : "s"}`}
                          </span>
                        </td>
                      </tr>,
                      ...month.rows.map((row) => {
                        const key = pctRowKey(month.key, row.key);
                        return (
                          <tr key={`${month.key}-${row.key}`}>
                            <td title={row.stockGroup}>{formatText(row.stockGroup)}</td>
                            <td className="app-table-num">{formatNumber(row.box)}</td>
                            <td className="app-table-num">{formatNumber(row.qty)}</td>
                            <td className="app-table-num">
                              {formatMoney(row.purchaseValue)}
                            </td>
                            <td className="app-table-num costing-credit-cell">
                              <FormInput
                                type="text"
                                inputMode="decimal"
                                className="costing-credit-input"
                                disabled={filtersDisabled}
                                autoComplete="new-password"
                                data-1p-ignore
                                data-lpignore="true"
                                aria-label={`Credit note % for ${row.stockGroup}`}
                                value={row.pctInput}
                                onChange={(event) => {
                                  const value = sanitizeDecimalInput(event.target.value);
                                  setPctOverrides((current) => ({
                                    ...current,
                                    [key]: value,
                                  }));
                                }}
                                onBlur={() => {
                                  setPctOverrides((current) => ({
                                    ...current,
                                    [key]: formatDecimalDisplay(current[key] ?? row.pctInput),
                                  }));
                                }}
                                onKeyDown={blockNonDecimalKeyDown}
                              />
                            </td>
                            <td className="app-table-num">
                              {formatMoney(row.creditNoteValue)}
                            </td>
                          </tr>
                        );
                      }),
                      <tr key={`subtotal-${month.key}`} className="app-table-subtotal">
                        <td>Subtotal</td>
                        <td className="app-table-num">{formatNumber(month.box)}</td>
                        <td className="app-table-num">{formatNumber(month.qty)}</td>
                        <td className="app-table-num">
                          {formatMoney(month.purchaseValue)}
                        </td>
                        <td className="app-table-num">{formatPctValue(month.pct)}</td>
                        <td className="app-table-num">
                          {formatMoney(month.creditNoteValue)}
                        </td>
                      </tr>,
                    ])
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="app-table-foot app-table-foot--aligned">
            <table className="app-table app-table--sales-report app-table--credit-note-workings">
              <CreditNoteWorkingsColgroup />
              <tbody>
                <tr>
                  <td>
                    <span className="app-table-foot-label">{footLabel}</span>
                  </td>
                  <td className="app-table-num">
                    {!isLoading && !loadError ? formatNumber(totalBox) : "—"}
                  </td>
                  <td className="app-table-num">
                    {!isLoading && !loadError ? formatNumber(totalQty) : "—"}
                  </td>
                  <td className="app-table-num">
                    {!isLoading && !loadError ? formatMoney(totalPurchaseValue) : "—"}
                  </td>
                  <td className="app-table-num">
                    {!isLoading && !loadError ? formatPctValue(totalPct) : "—"}
                  </td>
                  <td className="app-table-num">
                    {!isLoading && !loadError
                      ? formatMoney(totalCreditNoteValue)
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
