import { BanknotesIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  FormAutocomplete,
  FormDropdown,
  FormField,
  FormInput,
  FormPanel,
  defaultWinForm,
} from "@/components/forms";
import type { FormDropdownOption } from "@/components/forms";
import { PrimaryContentLayout } from "@/components/layout/PrimaryContentLayout";
import { Modal } from "@/components/ui/Modal";
import { useFormMessage } from "@/hooks/useFormMessage";
import { costCentreService } from "@/services/costCentreService";
import { inventoryMasterService } from "@/services/inventoryMasterService";
import { stockSummaryService } from "@/services/stockSummaryService";
import type { InventoryMasterItem } from "@/types/inventoryMaster";

/** Stock groups issued into blowing (case-insensitive). */
const TAKEN_STOCK_GROUPS = new Set(["caps", "preform"]);

const JOB_STATUS_OPTIONS: FormDropdownOption[] = [
  { value: "Open", label: "Open" },
  { value: "Close", label: "Close" },
];

type JobStatus = "Open" | "Close";

type LineSide = "taken" | "received";

type ProductionEntry = {
  key: string;
  date: string;
  qty: string;
};

type LineRow = {
  key: string;
  stock_item: string;
  qty: string;
  /** Taken lines only — editable; defaults from stock summary closing rate. */
  rate: string;
  /** Received lines — daily production breakdown; qty is the sum of these. */
  productionEntries?: ProductionEntry[];
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


function generateJobNo(jobDate: string): string {
  const datePart = (jobDate.trim() || todayIsoDate()).replace(/-/g, "");
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `BLW-${datePart}-${hh}${mm}${ss}${suffix}`;
}


function emptyLine(): LineRow {
  return { key: nextKey(), stock_item: "", qty: "", rate: "" };
}

function emptyProductionEntry(date = todayIsoDate()): ProductionEntry {
  return { key: nextKey(), date, qty: "" };
}

function sumProductionEntries(entries: ProductionEntry[]): number {
  return entries.reduce(
    (sum, entry) => sum + (parsePositiveNumber(entry.qty) ?? 0),
    0,
  );
}

/** Received line qty is the sum of production-entry qtys when present. */
function getReceivedLineQty(line: LineRow): number | null {
  const entries = line.productionEntries;
  if (entries != null && entries.length > 0) {
    const sum = sumProductionEntries(entries);
    return sum > 0 ? sum : null;
  }
  return parsePositiveNumber(line.qty);
}

function allocateReceivedProductionCost(
  lines: LineRow[],
  productionCostTotal: number,
): {
  amountsByKey: Record<string, number>;
  ratesByKey: Record<string, number>;
  totalValue: number;
} {
  const amountsByKey: Record<string, number> = {};
  const ratesByKey: Record<string, number> = {};
  const filled: Array<{ key: string; qty: number }> = [];

  for (const line of lines) {
    const qty = getReceivedLineQty(line);
    if (qty != null) {
      filled.push({ key: line.key, qty });
    }
  }

  const qtyTotal = filled.reduce((sum, row) => sum + row.qty, 0);
  if (qtyTotal <= 0) {
    return { amountsByKey, ratesByKey, totalValue: 0 };
  }

  const cost = productionCostTotal > 0 ? productionCostTotal : 0;
  let allocated = 0;
  filled.forEach((row, index) => {
    const isLast = index === filled.length - 1;
    const amount =
      cost <= 0
        ? 0
        : isLast
          ? roundMoney(cost - allocated)
          : roundMoney((cost * row.qty) / qtyTotal);
    allocated = roundMoney(allocated + amount);
    amountsByKey[row.key] = amount;
    ratesByKey[row.key] = roundMoney(amount / row.qty);
  });

  return {
    amountsByKey,
    ratesByKey,
    totalValue: cost,
  };
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
  expensesValue,
  onOpenExpenses,
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
  expensesValue: number;
  onOpenExpenses: () => void;
  onChangeItem: (key: string, stockItem: string) => void;
  onChangeQty: (key: string, qty: string) => void;
  onChangeRate: (key: string, rate: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  totalValue: number;
}) {
  return (
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
                <th>Stock item taken for production</th>
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
                <tr className="production-blowing-expenses-row">
                  <td>{lines.length + 1}</td>
                  <td>Expenses</td>
                  <td>—</td>
                  <td className="app-table-num">—</td>
                  <td className="app-table-num">—</td>
                  <td className="app-table-num">—</td>
                  <td className="app-table-num">
                    <button
                      type="button"
                      className="production-blowing-expenses-btn"
                      onClick={onOpenExpenses}
                      title="Edit expenses"
                    >
                      {formatMoney(expensesValue)}
                    </button>
                  </td>
                  <td aria-hidden="true" />
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="app-table-num font-semibold">
                    Total taken value
                  </td>
                  <td className="app-table-num font-semibold">
                    {formatMoney(totalValue)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="production-blowing-icon-btn"
                      onClick={onAdd}
                      aria-label="Add taken line"
                      title="Add line"
                    >
                      <PlusIcon aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tfoot>
          </table>
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
  productionCostTotal,
  onChangeItem,
  onOpenProductionQty,
  onAdd,
  onRemove,
}: {
  lines: LineRow[];
  options: Array<{ value: string; label: string }>;
  itemByName: Map<string, InventoryMasterItem>;
  stockQtyByItem: Map<string, number>;
  productionCostTotal: number;
  onChangeItem: (key: string, stockItem: string) => void;
  onOpenProductionQty: (key: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  const { amountsByKey, ratesByKey, totalValue } = useMemo(
    () => allocateReceivedProductionCost(lines, productionCostTotal),
    [lines, productionCostTotal],
  );

  return (
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
                <th>Stock item received from production</th>
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
                  const amount = amountsByKey[line.key];
                  const rate = ratesByKey[line.key];
                  const stockQty = line.stock_item
                    ? stockQtyByItem.get(line.stock_item)
                    : undefined;
                  const qtyNum = getReceivedLineQty(line);
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
                        <button
                          type="button"
                          className="production-blowing-expenses-btn"
                          onClick={() => onOpenProductionQty(line.key)}
                          title="Enter production qty by date"
                        >
                          {qtyNum != null ? formatQty(qtyNum) : "—"}
                        </button>
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
                  <td>
                    <button
                      type="button"
                      className="production-blowing-icon-btn"
                      onClick={onAdd}
                      aria-label="Add received line"
                      title="Add line"
                    >
                      <PlusIcon aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ProductionBlowingPage() {
  const { showError, showInfo } = useFormMessage();
  const [jobDate, setJobDate] = useState(todayIsoDate);
  const [jobFinishDate, setJobFinishDate] = useState("");
  const [jobNo, setJobNo] = useState("");
  const [jobStatus, setJobStatus] = useState<JobStatus>("Open");
  const [machine, setMachine] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [electricityCost, setElectricityCost] = useState("");
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [draftLabourCost, setDraftLabourCost] = useState("");
  const [draftElectricityCost, setDraftElectricityCost] = useState("");
  const [productionQtyLineKey, setProductionQtyLineKey] = useState<string | null>(
    null,
  );
  const [draftProductionEntries, setDraftProductionEntries] = useState<
    ProductionEntry[]
  >([]);
  const [takenLines, setTakenLines] = useState<LineRow[]>(() => [emptyLine()]);
  const [receivedLines, setReceivedLines] = useState<LineRow[]>(() => [
    emptyLine(),
  ]);

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

  const takenMaterialsValue = useMemo(() => {
    let total = 0;
    for (const line of takenLines) {
      const amount = lineAmount(line.qty, line.rate);
      if (amount != null) {
        total += amount;
      }
    }
    return roundMoney(total);
  }, [takenLines]);

  const expensesValue = useMemo(() => {
    const labour = parseNonNegativeNumber(labourCost) ?? 0;
    const eb = parseNonNegativeNumber(electricityCost) ?? 0;
    return roundMoney(labour + eb);
  }, [labourCost, electricityCost]);

  const takenTotalValue = useMemo(
    () => roundMoney(takenMaterialsValue + expensesValue),
    [takenMaterialsValue, expensesValue],
  );

  const productionCostTotal = takenTotalValue;

  function updateLine(
    side: LineSide,
    key: string,
    patch: Partial<
      Pick<LineRow, "stock_item" | "qty" | "rate" | "productionEntries">
    >,
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
      return "Add at least one stock item under Taken for production";
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
      (line) =>
        line.stock_item.trim() ||
        line.qty.trim() ||
        (line.productionEntries?.length ?? 0) > 0,
    );
    if (filled.length === 0) {
      if (jobStatus === "Close") {
        return "Add at least one stock item under Received from production when status is Close";
      }
      return undefined;
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
      if (getReceivedLineQty(line) === null) {
        return `Enter production qty for ${item} under Received from production`;
      }
    }
    return undefined;
  }


  function openExpensesModal() {
    setDraftLabourCost(labourCost);
    setDraftElectricityCost(electricityCost);
    setExpensesOpen(true);
  }

  function openProductionQtyModal(lineKey: string) {
    const line = receivedLines.find((row) => row.key === lineKey);
    if (!line) {
      return;
    }
    if (!line.stock_item.trim()) {
      showError("Select a stock item before entering production qty");
      return;
    }
    const defaultDate = jobDate.trim() || todayIsoDate();
    const existing = line.productionEntries ?? [];
    setDraftProductionEntries(
      existing.length > 0
        ? existing.map((entry) => ({ ...entry }))
        : [emptyProductionEntry(defaultDate)],
    );
    setProductionQtyLineKey(lineKey);
  }

  function updateDraftProductionEntry(
    key: string,
    patch: Partial<Pick<ProductionEntry, "date" | "qty">>,
  ) {
    setDraftProductionEntries((current) =>
      current.map((entry) =>
        entry.key === key ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function addDraftProductionEntry() {
    const defaultDate = jobDate.trim() || todayIsoDate();
    setDraftProductionEntries((current) => [
      ...current,
      emptyProductionEntry(defaultDate),
    ]);
  }

  function removeDraftProductionEntry(key: string) {
    setDraftProductionEntries((current) => {
      const next = current.filter((entry) => entry.key !== key);
      return next.length === 0
        ? [emptyProductionEntry(jobDate.trim() || todayIsoDate())]
        : next;
    });
  }

  function applyProductionQty() {
    if (!productionQtyLineKey) {
      return;
    }
    const jobDateValue = jobDate.trim();
    const filled = draftProductionEntries.filter(
      (entry) => entry.date.trim() || entry.qty.trim(),
    );
    for (const entry of filled) {
      const date = entry.date.trim();
      if (!date) {
        showError("Production date is required on every filled row");
        return;
      }
      if (jobDateValue && date < jobDateValue) {
        showError("Production date must be on or after job date");
        return;
      }
      if (parsePositiveNumber(entry.qty) === null) {
        showError("Enter a positive production qty on every filled row");
        return;
      }
    }
    const total = sumProductionEntries(filled);
    const lineKey = productionQtyLineKey;
    setReceivedLines((current) =>
      current.map((line) =>
        line.key === lineKey
          ? {
              ...line,
              productionEntries: filled.map((entry) => ({
                ...entry,
                date: entry.date.trim(),
                qty: entry.qty.trim(),
              })),
              qty: total > 0 ? String(Math.round(total)) : "",
            }
          : line,
      ),
    );
    setProductionQtyLineKey(null);
  }

  function applyExpenses() {
    const labourRaw = draftLabourCost.trim();
    const electricityRaw = draftElectricityCost.trim();
    if (labourRaw) {
      const labourParsed = Number(labourRaw);
      if (!Number.isFinite(labourParsed) || labourParsed < 0) {
        showError("Labour cost must be a non-negative number");
        return;
      }
    }
    if (electricityRaw) {
      const electricityParsed = Number(electricityRaw);
      if (!Number.isFinite(electricityParsed) || electricityParsed < 0) {
        showError("Electricity cost must be a non-negative number");
        return;
      }
    }
    setLabourCost(labourRaw ? formatRateDisplay(labourRaw) : "");
    setElectricityCost(electricityRaw ? formatRateDisplay(electricityRaw) : "");
    setExpensesOpen(false);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!jobDate.trim()) {
      showError("Job date is required");
      return;
    }
    if (jobStatus === "Close") {
      if (!jobFinishDate.trim()) {
        showError("Job finish date is required when status is Close");
        return;
      }
      if (jobFinishDate.trim() < jobDate.trim()) {
        showError("Job finish date must be on or after job date");
        return;
      }
    } else if (
      jobFinishDate.trim() &&
      jobFinishDate.trim() < jobDate.trim()
    ) {
      showError("Job finish date must be on or after job date");
      return;
    }
    if (labourCost.trim()) {
      const labourParsed = Number(labourCost.trim());
      if (!Number.isFinite(labourParsed) || labourParsed < 0) {
        showError("Labour cost must be a non-negative number");
        return;
      }
    }
    if (electricityCost.trim()) {
      const ebParsed = Number(electricityCost.trim());
      if (!Number.isFinite(ebParsed) || ebParsed < 0) {
        showError("Electricity cost must be a non-negative number");
        return;
      }
    }

    const takenAllowed = new Set(takenOptions.map((option) => option.value));
    const receivedAllowed = new Set(
      receivedOptions.map((option) => option.value),
    );

    const takenError = validateTakenLines(takenAllowed);
    if (takenError) {
      showError(takenError);
      return;
    }
    const receivedError = validateReceivedLines(receivedAllowed);
    if (receivedError) {
      showError(receivedError);
      return;
    }

    const assignedJobNo = jobNo.trim() || generateJobNo(jobDate);
    if (!jobNo.trim()) {
      setJobNo(assignedJobNo);
    }

    showInfo(
      `Job ${assignedJobNo} ready — save to database is not connected yet.`,
    );
  }

  return (
    <PrimaryContentLayout
      breadcrumb={[
        { label: "Stock Movements" },
        {
          label: "Production (Blowing)",
          to: "/stock-movements/blowing",
        },
      ]}
      onSubmit={onSubmit}
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
        <FormPanel hideHeader wide>
          <div className="grid grid-cols-5 gap-4">
            <FormField label="Job date">
              <FormInput
                type="date"
                value={jobDate}
                onChange={(event) => setJobDate(event.target.value)}
              />
            </FormField>
            <FormField label="Job finish date">
              <FormInput
                type="date"
                value={jobFinishDate}
                onChange={(event) => setJobFinishDate(event.target.value)}
              />
            </FormField>
            <FormField label="Job no">
              <FormInput
                type="text"
                value={jobNo}
                readOnly
                placeholder="Assigned on save"
              />
            </FormField>
            <FormField label="Status">
              <FormDropdown
                options={JOB_STATUS_OPTIONS}
                value={jobStatus}
                onChange={(value) => {
                  const next = value as JobStatus;
                  setJobStatus(next);
                  if (next === "Close") {
                    setJobFinishDate(todayIsoDate());
                  } else {
                    setJobFinishDate("");
                  }
                }}
                placeholder="Select status"
                emptyMessage="No statuses"
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
          </div>
        </FormPanel>

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
          expensesValue={expensesValue}
          onOpenExpenses={openExpensesModal}
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
          productionCostTotal={productionCostTotal}
          onChangeItem={(key, stockItem) =>
            updateLine("received", key, { stock_item: stockItem })
          }
          onOpenProductionQty={openProductionQtyModal}
          onAdd={() => addLine("received")}
          onRemove={(key) => removeLine("received", key)}
        />
      </div>

      {productionQtyLineKey ? (
        <Modal
          title={
            receivedLines.find((line) => line.key === productionQtyLineKey)
              ?.stock_item || "Production qty"
          }
          onClose={() => setProductionQtyLineKey(null)}
          className="app-modal--production-qty"
          ariaLabelledBy="production-qty-modal-title"
        >
          <div className="production-qty-modal-body">
            <div className="app-table-wrap production-qty-modal-table-wrap">
              <div className="app-table-shell">
                <table className="app-table production-qty-modal-table">
                  <colgroup>
                    <col style={{ width: "12rem" }} />
                    <col />
                    <col style={{ width: "2.75rem" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="app-table-num">Production qty</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {draftProductionEntries.map((entry) => (
                      <tr key={entry.key}>
                        <td>
                          <FormInput
                            type="date"
                            value={entry.date}
                            onChange={(event) =>
                              updateDraftProductionEntry(entry.key, {
                                date: event.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="app-table-num">
                          <FormInput
                            type="text"
                            inputMode="numeric"
                            className="production-blowing-num-input"
                            value={entry.qty}
                            onChange={(event) =>
                              updateDraftProductionEntry(entry.key, {
                                qty: sanitizeQtyInput(event.target.value),
                              })
                            }
                            onKeyDown={blockNonIntegerKeyDown}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="production-blowing-icon-btn"
                            onClick={() =>
                              removeDraftProductionEntry(entry.key)
                            }
                            aria-label="Remove production row"
                            title="Remove row"
                          >
                            <TrashIcon aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="app-table-num font-semibold">Total qty</td>
                      <td className="app-table-num font-semibold">
                        {formatQty(sumProductionEntries(draftProductionEntries) || null)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="production-blowing-icon-btn"
                          onClick={addDraftProductionEntry}
                          aria-label="Add production row"
                          title="Add row"
                        >
                          <PlusIcon aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <div className="production-expenses-modal-footer">
            <button
              type="button"
              className={defaultWinForm.button}
              onClick={() => setProductionQtyLineKey(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={defaultWinForm.buttonPrimary}
              onClick={applyProductionQty}
            >
              Apply
            </button>
          </div>
        </Modal>
      ) : null}

      {expensesOpen ? (
        <Modal
          title="Expenses"
          titleIcon={BanknotesIcon}
          onClose={() => setExpensesOpen(false)}
          className="app-modal--production-expenses"
          ariaLabelledBy="production-expenses-modal-title"
        >
          <div className="production-expenses-modal-body">
            <FormField label="Labour cost">
              <FormInput
                type="text"
                inputMode="decimal"
                className="production-blowing-num-input"
                value={draftLabourCost}
                onChange={(event) =>
                  setDraftLabourCost(sanitizeDecimalInput(event.target.value))
                }
                onBlur={() =>
                  setDraftLabourCost(formatRateDisplay(draftLabourCost))
                }
                onKeyDown={blockNonDecimalKeyDown}
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Electricity cost">
              <FormInput
                type="text"
                inputMode="decimal"
                className="production-blowing-num-input"
                value={draftElectricityCost}
                onChange={(event) =>
                  setDraftElectricityCost(
                    sanitizeDecimalInput(event.target.value),
                  )
                }
                onBlur={() =>
                  setDraftElectricityCost(
                    formatRateDisplay(draftElectricityCost),
                  )
                }
                onKeyDown={blockNonDecimalKeyDown}
                placeholder="0.00"
              />
            </FormField>
          </div>
          <div className="production-expenses-modal-footer">
            <button
              type="button"
              className={defaultWinForm.button}
              onClick={() => setExpensesOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={defaultWinForm.buttonPrimary}
              onClick={applyExpenses}
            >
              Apply
            </button>
          </div>
        </Modal>
      ) : null}
    </PrimaryContentLayout>
  );
}
