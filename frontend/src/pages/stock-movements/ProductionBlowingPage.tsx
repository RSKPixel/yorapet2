import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormPanel,
  defaultWinForm,
} from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFormMessage } from "@/hooks/useFormMessage";
import { costCentreService } from "@/services/costCentreService";
import { inventoryMasterService } from "@/services/inventoryMasterService";
import { stockSummaryService } from "@/services/stockSummaryService";
import type { InventoryMasterItem } from "@/types/inventoryMaster";

/** Stock groups issued into blowing (case-insensitive). */
const TAKEN_STOCK_GROUPS = new Set(["caps", "preform"]);

type LineSide = "taken" | "received";

type LineRow = {
  key: string;
  stock_item: string;
  qty: string;
  /** Taken lines only — editable; defaults from stock summary closing rate. */
  rate: string;
};

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyLine(): LineRow {
  return { key: nextKey(), stock_item: "", qty: "", rate: "" };
}

function normalizeGroup(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isTakenStockGroup(stockGroup: string | null | undefined) {
  return TAKEN_STOCK_GROUPS.has(normalizeGroup(stockGroup));
}

function toItemOptions(items: InventoryMasterItem[]) {
  return items
    .map((item) => item.stock_item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function sanitizeQtyInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot < 0) {
    return cleaned;
  }
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return moneyFormatter.format(value);
}

function formatQty(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatRateDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") {
    return "";
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) {
    return "";
  }
  return num.toFixed(2);
}

function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return num;
}

function parseNonNegativeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) {
    return null;
  }
  return num;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function lineAmount(qty: string, rate: string): number | null {
  const q = parsePositiveNumber(qty);
  const r = parsePositiveNumber(rate);
  if (q === null || r === null) {
    return null;
  }
  return roundMoney(q * r);
}

function blockNonIntegerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (
    event.key === "-" ||
    event.key === "+" ||
    event.key === "e" ||
    event.key === "E" ||
    event.key === "."
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
  if (allowed.includes(event.key) || /^\d$/.test(event.key)) {
    return;
  }
  event.preventDefault();
}

function blockNonDecimalKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (event.key === "-" || event.key === "+" || event.key === "e" || event.key === "E") {
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
  if (allowed.includes(event.key) || /^\d$/.test(event.key) || event.key === ".") {
    return;
  }
  event.preventDefault();
}

function TakenLineSection({
  lines,
  options,
  itemByName,
  stockQtyByItem,
  onChangeItem,
  onChangeQty,
  onChangeRate,
  onAdd,
  onRemove,
  totalValue,
}: {
  lines: LineRow[];
  options: Array<{ value: string; label: string }>;
  itemByName: Map<string, InventoryMasterItem>;
  stockQtyByItem: Map<string, number>;
  onChangeItem: (key: string, stockItem: string) => void;
  onChangeQty: (key: string, qty: string) => void;
  onChangeRate: (key: string, rate: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  totalValue: number;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Taken for production</h2>
        <button
          type="button"
          className="production-blowing-icon-btn"
          onClick={onAdd}
          aria-label="Add line"
          title="Add line"
        >
          <PlusIcon aria-hidden="true" />
        </button>
      </div>
      <div className="app-table-wrap production-blowing-table-wrap">
        <div className="app-table-shell">
          <div className="app-table-scroll production-blowing-table-scroll">
            <table className="app-table production-blowing-table">
              <colgroup>
                <col style={{ width: "3rem" }} />
                <col />
                <col style={{ width: "5rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "8rem" }} />
                <col style={{ width: "8rem" }} />
                <col style={{ width: "2.75rem" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stock item</th>
                  <th>Unit</th>
                  <th className="app-table-num">Stock</th>
                  <th className="app-table-num">Qty</th>
                  <th className="app-table-num">Rate</th>
                  <th className="app-table-num">Value</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const master = itemByName.get(line.stock_item);
                  const amount = lineAmount(line.qty, line.rate);
                  const stockQty = line.stock_item
                    ? stockQtyByItem.get(line.stock_item)
                    : undefined;
                  return (
                    <tr key={line.key}>
                      <td>{index + 1}</td>
                      <td>
                        <FormAutocomplete
                          value={line.stock_item}
                          onChange={(value) => onChangeItem(line.key, value)}
                          options={options}
                          placeholder="Search stock item"
                          emptyMessage="No matching items"
                        />
                      </td>
                      <td>{master?.base_unit?.trim() || "—"}</td>
                      <td className="app-table-num">{formatQty(stockQty)}</td>
                      <td className="app-table-num">
                        <FormInput
                          type="text"
                          inputMode="numeric"
                          value={line.qty}
                          onChange={(event) =>
                            onChangeQty(line.key, sanitizeQtyInput(event.target.value))
                          }
                          onKeyDown={blockNonIntegerKeyDown}
                        />
                      </td>
                      <td className="app-table-num">
                        <FormInput
                          type="text"
                          inputMode="decimal"
                          value={line.rate}
                          onChange={(event) =>
                            onChangeRate(
                              line.key,
                              sanitizeDecimalInput(event.target.value),
                            )
                          }
                          onBlur={() =>
                            onChangeRate(line.key, formatRateDisplay(line.rate))
                          }
                          onKeyDown={blockNonDecimalKeyDown}
                        />
                      </td>
                      <td className="app-table-num">{formatMoney(amount)}</td>
                      <td>
                        <button
                          type="button"
                          className="production-blowing-icon-btn"
                          onClick={() => onRemove(line.key)}
                          aria-label="Remove line"
                          title="Remove line"
                        >
                          <TrashIcon aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="app-table-num font-semibold">
                    Total taken value
                  </td>
                  <td className="app-table-num font-semibold">
                    {formatMoney(totalValue)}
                  </td>
                  <td aria-hidden="true" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceivedLineSection({
  lines,
  options,
  itemByName,
  stockQtyByItem,
  amountsByKey,
  ratesByKey,
  onChangeItem,
  onChangeQty,
  onAdd,
  onRemove,
  totalValue,
}: {
  lines: LineRow[];
  options: Array<{ value: string; label: string }>;
  itemByName: Map<string, InventoryMasterItem>;
  stockQtyByItem: Map<string, number>;
  amountsByKey: Map<string, number>;
  ratesByKey: Map<string, number>;
  onChangeItem: (key: string, stockItem: string) => void;
  onChangeQty: (key: string, qty: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  totalValue: number;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Received from production</h2>
        <button
          type="button"
          className="production-blowing-icon-btn"
          onClick={onAdd}
          aria-label="Add line"
          title="Add line"
        >
          <PlusIcon aria-hidden="true" />
        </button>
      </div>
      <div className="app-table-wrap production-blowing-table-wrap">
        <div className="app-table-shell">
          <div className="app-table-scroll production-blowing-table-scroll">
            <table className="app-table production-blowing-table">
              <colgroup>
                <col style={{ width: "3rem" }} />
                <col />
                <col style={{ width: "5rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "8rem" }} />
                <col style={{ width: "8rem" }} />
                <col style={{ width: "2.75rem" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stock item</th>
                  <th>Unit</th>
                  <th className="app-table-num">Stock</th>
                  <th className="app-table-num">Qty</th>
                  <th className="app-table-num">Rate</th>
                  <th className="app-table-num">Value</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const master = itemByName.get(line.stock_item);
                  const amount = amountsByKey.get(line.key);
                  const rate = ratesByKey.get(line.key);
                  const stockQty = line.stock_item
                    ? stockQtyByItem.get(line.stock_item)
                    : undefined;
                  return (
                    <tr key={line.key}>
                      <td>{index + 1}</td>
                      <td>
                        <FormAutocomplete
                          value={line.stock_item}
                          onChange={(value) => onChangeItem(line.key, value)}
                          options={options}
                          placeholder="Search stock item"
                          emptyMessage="No matching items"
                        />
                      </td>
                      <td>{master?.base_unit?.trim() || "—"}</td>
                      <td className="app-table-num">{formatQty(stockQty)}</td>
                      <td className="app-table-num">
                        <FormInput
                          type="text"
                          inputMode="numeric"
                          value={line.qty}
                          onChange={(event) =>
                            onChangeQty(line.key, sanitizeQtyInput(event.target.value))
                          }
                          onKeyDown={blockNonIntegerKeyDown}
                        />
                      </td>
                      <td className="app-table-num">{formatMoney(rate)}</td>
                      <td className="app-table-num">{formatMoney(amount)}</td>
                      <td>
                        <button
                          type="button"
                          className="production-blowing-icon-btn"
                          onClick={() => onRemove(line.key)}
                          aria-label="Remove line"
                          title="Remove line"
                        >
                          <TrashIcon aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="app-table-num font-semibold">
                    Total received value
                  </td>
                  <td className="app-table-num font-semibold">
                    {formatMoney(totalValue)}
                  </td>
                  <td aria-hidden="true" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductionBlowingPage() {
  const { showInfo } = useFormMessage();
  const [jobDate, setJobDate] = useState(todayIsoDate);
  const [batchNo, setBatchNo] = useState("");
  const [machine, setMachine] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [ebCost, setEbCost] = useState("");
  const [takenLines, setTakenLines] = useState<LineRow[]>(() => [emptyLine()]);
  const [receivedLines, setReceivedLines] = useState<LineRow[]>(() => [
    emptyLine(),
  ]);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const inventoryQuery = useQuery({
    queryKey: ["inventory-master"],
    queryFn: () => inventoryMasterService.list(),
  });

  const stockSummaryQuery = useQuery({
    queryKey: ["stock-summary"],
    queryFn: () => stockSummaryService.getSummary(),
  });

  const machinesQuery = useQuery({
    queryKey: ["cost-centres", "blow-machines"],
    queryFn: () => costCentreService.list(),
  });

  const items = inventoryQuery.data ?? [];

  const rateByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockSummaryQuery.data?.items ?? []) {
      const name = row.stock_item.trim();
      if (name && row.closing_rate != null && Number.isFinite(row.closing_rate)) {
        map.set(name, row.closing_rate);
      }
    }
    return map;
  }, [stockSummaryQuery.data]);

  const stockQtyByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockSummaryQuery.data?.items ?? []) {
      const name = row.stock_item.trim();
      if (name && Number.isFinite(row.closing_qty)) {
        map.set(name, row.closing_qty);
      }
    }
    return map;
  }, [stockSummaryQuery.data]);

  const itemByName = useMemo(() => {
    const map = new Map<string, InventoryMasterItem>();
    for (const item of items) {
      const name = item.stock_item.trim();
      if (name) {
        map.set(name, item);
      }
    }
    return map;
  }, [items]);

  const machineOptions = useMemo(
    () =>
      (machinesQuery.data ?? [])
        .map((row) => row.name.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    [machinesQuery.data],
  );

  const takenOptions = useMemo(
    () =>
      toItemOptions(items.filter((item) => isTakenStockGroup(item.stock_group))),
    [items],
  );

  const receivedOptions = useMemo(
    () =>
      toItemOptions(
        items.filter(
          (item) =>
            Boolean(item.stock_item.trim()) &&
            !isTakenStockGroup(item.stock_group),
        ),
      ),
    [items],
  );

  const takenTotalValue = useMemo(() => {
    let total = 0;
    for (const line of takenLines) {
      const amount = lineAmount(line.qty, line.rate);
      if (amount != null) {
        total += amount;
      }
    }
    return roundMoney(total);
  }, [takenLines]);

  const productionCostTotal = useMemo(() => {
    const labour = parseNonNegativeNumber(labourCost) ?? 0;
    const eb = parseNonNegativeNumber(ebCost) ?? 0;
    return roundMoney(takenTotalValue + labour + eb);
  }, [takenTotalValue, labourCost, ebCost]);

  const receivedAllocation = useMemo(() => {
    const amountsByKey = new Map<string, number>();
    const ratesByKey = new Map<string, number>();
    const filled = receivedLines.filter(
      (line) => parsePositiveNumber(line.qty) != null,
    );
    const qtyTotal = filled.reduce(
      (sum, line) => sum + (parsePositiveNumber(line.qty) ?? 0),
      0,
    );

    if (productionCostTotal <= 0 || qtyTotal <= 0) {
      return { amountsByKey, ratesByKey, totalValue: 0 };
    }

    let allocated = 0;
    filled.forEach((line, index) => {
      const qty = parsePositiveNumber(line.qty) ?? 0;
      const isLast = index === filled.length - 1;
      const amount = isLast
        ? roundMoney(productionCostTotal - allocated)
        : roundMoney((productionCostTotal * qty) / qtyTotal);
      allocated = roundMoney(allocated + amount);
      amountsByKey.set(line.key, amount);
      ratesByKey.set(line.key, roundMoney(amount / qty));
    });

    return {
      amountsByKey,
      ratesByKey,
      totalValue: productionCostTotal,
    };
  }, [receivedLines, productionCostTotal]);

  function updateLine(
    side: LineSide,
    key: string,
    patch: Partial<Pick<LineRow, "stock_item" | "qty" | "rate">>,
  ) {
    const setter = side === "taken" ? setTakenLines : setReceivedLines;
    setter((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function selectTakenItem(key: string, stockItem: string) {
    const closingRate = rateByItem.get(stockItem);
    updateLine("taken", key, {
      stock_item: stockItem,
      rate:
        closingRate != null && Number.isFinite(closingRate)
          ? closingRate.toFixed(2)
          : "",
    });
  }

  function addLine(side: LineSide) {
    const setter = side === "taken" ? setTakenLines : setReceivedLines;
    setter((current) => [...current, emptyLine()]);
  }

  function removeLine(side: LineSide, key: string) {
    const setter = side === "taken" ? setTakenLines : setReceivedLines;
    setter((current) => {
      const next = current.filter((line) => line.key !== key);
      return next.length === 0 ? [emptyLine()] : next;
    });
  }

  function validateTakenLines(allowed: Set<string>): string | undefined {
    const filled = takenLines.filter(
      (line) => line.stock_item.trim() || line.qty.trim() || line.rate.trim(),
    );
    if (filled.length === 0) {
      return "Add at least one line under Taken for production";
    }
    const seen = new Set<string>();
    for (const line of filled) {
      const item = line.stock_item.trim();
      if (!item) {
        return "Select a stock item on every filled Taken line";
      }
      if (!allowed.has(item)) {
        return `"${item}" is not allowed under Taken for production`;
      }
      if (seen.has(item)) {
        return `Duplicate stock item "${item}" under Taken for production`;
      }
      seen.add(item);
      if (parsePositiveNumber(line.qty) === null) {
        return `Enter qty for ${item} under Taken for production`;
      }
      if (parsePositiveNumber(line.rate) === null) {
        return `Enter rate for ${item} under Taken for production`;
      }
    }
    return undefined;
  }

  function validateReceivedLines(allowed: Set<string>): string | undefined {
    const filled = receivedLines.filter(
      (line) => line.stock_item.trim() || line.qty.trim(),
    );
    if (filled.length === 0) {
      return "Add at least one line under Received from production";
    }
    const seen = new Set<string>();
    for (const line of filled) {
      const item = line.stock_item.trim();
      if (!item) {
        return "Select a stock item on every filled Received line";
      }
      if (!allowed.has(item)) {
        return `"${item}" is not allowed under Received from production`;
      }
      if (seen.has(item)) {
        return `Duplicate stock item "${item}" under Received from production`;
      }
      seen.add(item);
      if (parsePositiveNumber(line.qty) === null) {
        return `Enter qty for ${item} under Received from production`;
      }
    }
    if (takenTotalValue <= 0) {
      return "Taken for production must have a positive total value";
    }
    return undefined;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!jobDate.trim()) {
      setFieldError("Job date is required");
      return;
    }
    if (!batchNo.trim()) {
      setFieldError("Batch no is required");
      return;
    }
    if (!machine.trim()) {
      setFieldError("Machine is required");
      return;
    }
    if (!labourCost.trim()) {
      setFieldError("Labour cost is required");
      return;
    }
    const labourParsed = Number(labourCost.trim());
    if (!Number.isFinite(labourParsed) || labourParsed < 0) {
      setFieldError("Labour cost must be a non-negative number");
      return;
    }
    if (!ebCost.trim()) {
      setFieldError("EB cost is required");
      return;
    }
    const ebParsed = Number(ebCost.trim());
    if (!Number.isFinite(ebParsed) || ebParsed < 0) {
      setFieldError("EB cost must be a non-negative number");
      return;
    }

    const takenAllowed = new Set(takenOptions.map((option) => option.value));
    const receivedAllowed = new Set(
      receivedOptions.map((option) => option.value),
    );

    const takenError = validateTakenLines(takenAllowed);
    if (takenError) {
      setFieldError(takenError);
      return;
    }
    const receivedError = validateReceivedLines(receivedAllowed);
    if (receivedError) {
      setFieldError(receivedError);
      return;
    }

    setFieldError(undefined);
    showInfo("Layout ready — save to database is not connected yet.");
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-auto">
      <PageHeader
        items={[
          { label: "Stock Movements" },
          {
            label: "Production (Blowing)",
            to: "/stock-movements/blowing",
          },
        ]}
      />

      <FormPanel
        hideHeader
        wide
        onSubmit={onSubmit}
        footerMessage={fieldError}
        footer={
          <button
            type="submit"
            className={defaultWinForm.buttonPrimary}
            disabled={inventoryQuery.isLoading}
          >
            Save
          </button>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-5 gap-4">
            <FormField label="Job date">
              <FormInput
                type="date"
                value={jobDate}
                onChange={(event) => setJobDate(event.target.value)}
              />
            </FormField>
            <FormField label="Batch no">
              <FormInput
                type="text"
                value={batchNo}
                onChange={(event) => setBatchNo(event.target.value)}
                placeholder="Batch number"
              />
            </FormField>
            <FormField label="Machine">
              <FormAutocomplete
                value={machine}
                onChange={setMachine}
                options={machineOptions}
                placeholder="Search machine"
                emptyMessage="No machines"
                disabled={machinesQuery.isLoading}
              />
            </FormField>
            <FormField label="Labour cost">
              <FormInput
                type="text"
                inputMode="decimal"
                className="production-blowing-num-input"
                value={labourCost}
                onChange={(event) =>
                  setLabourCost(sanitizeDecimalInput(event.target.value))
                }
                onBlur={() => setLabourCost(formatRateDisplay(labourCost))}
                onKeyDown={blockNonDecimalKeyDown}
                placeholder="0.00"
              />
            </FormField>
            <FormField label="EB cost">
              <FormInput
                type="text"
                inputMode="decimal"
                className="production-blowing-num-input"
                value={ebCost}
                onChange={(event) =>
                  setEbCost(sanitizeDecimalInput(event.target.value))
                }
                onBlur={() => setEbCost(formatRateDisplay(ebCost))}
                onKeyDown={blockNonDecimalKeyDown}
                placeholder="0.00"
              />
            </FormField>
          </div>

          {inventoryQuery.isError ? (
            <p className="text-sm text-[var(--color-danger)]">
              {(inventoryQuery.error as Error).message ||
                "Unable to load inventory master"}
            </p>
          ) : null}

          {machinesQuery.isError ? (
            <p className="text-sm text-[var(--color-danger)]">
              {(machinesQuery.error as Error).message ||
                "Unable to load machines"}
            </p>
          ) : null}

          <TakenLineSection
            lines={takenLines}
            options={takenOptions}
            itemByName={itemByName}
            stockQtyByItem={stockQtyByItem}
            onChangeItem={selectTakenItem}
            onChangeQty={(key, qty) => updateLine("taken", key, { qty })}
            onChangeRate={(key, rate) => updateLine("taken", key, { rate })}
            onAdd={() => addLine("taken")}
            onRemove={(key) => removeLine("taken", key)}
            totalValue={takenTotalValue}
          />

          <ReceivedLineSection
            lines={receivedLines}
            options={receivedOptions}
            itemByName={itemByName}
            stockQtyByItem={stockQtyByItem}
            amountsByKey={receivedAllocation.amountsByKey}
            ratesByKey={receivedAllocation.ratesByKey}
            onChangeItem={(key, stockItem) =>
              updateLine("received", key, { stock_item: stockItem })
            }
            onChangeQty={(key, qty) => updateLine("received", key, { qty })}
            onAdd={() => addLine("received")}
            onRemove={(key) => removeLine("received", key)}
            totalValue={receivedAllocation.totalValue}
          />
        </div>
      </FormPanel>
    </section>
  );
}
