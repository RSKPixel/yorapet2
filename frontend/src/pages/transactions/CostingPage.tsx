import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormPanel,
  defaultWinForm,
} from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFormMessage } from "@/hooks/useFormMessage";
import {
  decodeVoucherValue,
  formatVoucherDate,
  renderVoucherOption,
  toVoucherOptions,
} from "@/pages/transactions/voucherOptions";
import { purchaseCostingService } from "@/services/purchaseCostingService";
import type { PurchaseCostPreview } from "@/types/purchaseCosting";

const costingSchema = z.object({
  expenses: z.string(),
  credit_note: z.string(),
});

type CostingValues = z.infer<typeof costingSchema>;

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return Math.round(num).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Digits and at most one decimal point; no minus or other symbols. */
function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot < 0) {
    return cleaned;
  }
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

/** Format a numeric string to 2 decimal places when leaving the field. */
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
  // Disallow minus / plus / exponent — credit notes must be non-negative.
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

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/** Mirror backend: expenses / total_boxes * line.box (last line gets remainder). */
function allocateExpensesByBoxes(
  expenses: number,
  lines: Array<{ id: number; box: number | string | null }>,
): Record<number, number> {
  const boxes = lines.map((line) => ({
    id: line.id,
    box: Math.abs(toNumber(line.box)),
  }));
  const totalBoxes = boxes.reduce((sum, line) => sum + line.box, 0);
  const shares: Record<number, number> = {};
  if (totalBoxes === 0 || expenses === 0) {
    for (const line of boxes) {
      shares[line.id] = 0;
    }
    return shares;
  }
  let allocated = 0;
  const ordered = [...boxes].sort((a, b) => a.id - b.id);
  ordered.forEach((line, index) => {
    if (index === ordered.length - 1) {
      shares[line.id] = roundMoney(expenses - allocated);
      return;
    }
    const share = roundMoney((expenses * line.box) / totalBoxes);
    shares[line.id] = share;
    allocated = roundMoney(allocated + share);
  });
  return shares;
}

function computeLineCost(
  amount: number,
  expenses: number,
  credit: number,
  qty: number,
) {
  const costValue = roundMoney(amount + expenses - credit);
  if (qty === 0) {
    return { costValue, costPrice: null as number | null };
  }
  return { costValue, costPrice: roundMoney(costValue / qty) };
}

function CostingTableColgroup() {
  return (
    <colgroup>
      <col style={{ width: "22%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "10%" }} />
    </colgroup>
  );
}

export function CostingPage() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFormMessage();
  const [voucherValue, setVoucherValue] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [lineCredits, setLineCredits] = useState<Record<number, string>>({});

  const selected = useMemo(() => decodeVoucherValue(voucherValue), [voucherValue]);
  const voucherNo = selected.voucher_no;
  const voucherDate = selected.voucher_date;

  const vouchersQuery = useQuery({
    queryKey: ["purchase-costing", "vouchers"],
    queryFn: () => purchaseCostingService.listVouchers(),
  });

  const previewQuery = useQuery({
    queryKey: ["purchase-costing", "preview", voucherNo, voucherDate],
    queryFn: () => purchaseCostingService.preview(voucherNo, voucherDate),
    enabled: Boolean(voucherNo && voucherDate),
  });

  const voucherOptions = useMemo(
    () => toVoucherOptions(vouchersQuery.data ?? []),
    [vouchersQuery.data],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<CostingValues>({
    resolver: zodResolver(costingSchema),
    defaultValues: { expenses: "", credit_note: "" },
  });

  const creditNoteRegister = register("credit_note");
  const expensesRegister = register("expenses");
  const watchedExpenses = watch("expenses");
  const watchedCreditNote = watch("credit_note");

  useEffect(() => {
    setFieldError(undefined);
    if (!voucherNo || !voucherDate) {
      reset({ expenses: "", credit_note: "" });
      setLineCredits({});
      return;
    }
    const preview = previewQuery.data;
    if (!preview) {
      return;
    }
    reset({
      expenses: formatDecimalDisplay(String(preview.expenses ?? "0")),
      credit_note: formatDecimalDisplay(String(preview.credit_note ?? "0")),
    });
    const next: Record<number, string> = {};
    for (const line of preview.lines) {
      next[line.id] = formatDecimalDisplay(String(line.credit_note ?? "0"));
    }
    setLineCredits(next);
  }, [voucherNo, voucherDate, previewQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: purchaseCostingService.upsertCosting,
    onSuccess: async (updated) => {
      queryClient.setQueryData<PurchaseCostPreview>(
        ["purchase-costing", "preview", voucherNo, voucherDate],
        updated,
      );
      showSuccess("Costing saved.");
    },
    onError: (error: Error) => {
      showError(error.message || "Unable to save costing");
    },
  });

  const fieldsDisabled = !voucherNo || !voucherDate || vouchersQuery.isLoading;
  const lines = previewQuery.data?.lines ?? [];
  const preview = previewQuery.data;

  const liveRows = useMemo(() => {
    const expensesTotal = Math.max(0, toNumber(watchedExpenses));
    const expenseShares = allocateExpensesByBoxes(expensesTotal, lines);
    return lines.map((line) => {
      const expenses = expenseShares[line.id] ?? 0;
      const credit = Math.max(0, toNumber(lineCredits[line.id]));
      const amount = toNumber(line.amount);
      const qty = toNumber(line.qty);
      const { costValue, costPrice } = computeLineCost(amount, expenses, credit, qty);
      return {
        ...line,
        expenses,
        credit,
        costValue,
        costPrice,
      };
    });
  }, [lines, watchedExpenses, lineCredits]);

  const liveTotals = useMemo(() => {
    return {
      qty: liveRows.reduce((sum, row) => sum + toNumber(row.qty), 0),
      boxes: liveRows.reduce((sum, row) => sum + toNumber(row.box), 0),
      amount: roundMoney(liveRows.reduce((sum, row) => sum + toNumber(row.amount), 0)),
      credit_note: roundMoney(liveRows.reduce((sum, row) => sum + row.credit, 0)),
      cost_value: roundMoney(liveRows.reduce((sum, row) => sum + row.costValue, 0)),
    };
  }, [liveRows]);

  const lineCreditSum = liveTotals.credit_note;
  const creditMismatch =
    Boolean(voucherNo && voucherDate && lines.length > 0) &&
    roundMoney(toNumber(watchedCreditNote)) !== lineCreditSum;
  return (
    <section className="report-page">
      <PageHeader
        items={[
          { label: "Transactions" },
          { label: "Costing", to: "/transactions/costing" },
        ]}
      />

      <FormPanel
        hideHeader
        wide
        onSubmit={handleSubmit((values) => {
          if (!voucherNo || !voucherDate) {
            setFieldError("Select a voucher number");
            return;
          }
          const expensesRaw = values.expenses.trim();
          if (!expensesRaw) {
            setFieldError("Expenses is required");
            return;
          }
          const expenses = Number(expensesRaw);
          if (!Number.isFinite(expenses) || expenses < 0) {
            setFieldError("Expenses must be a non-negative number");
            return;
          }
          const creditRaw = values.credit_note.trim();
          if (!creditRaw) {
            setFieldError("Credit note is required");
            return;
          }
          const creditNote = Number(creditRaw);
          if (!Number.isFinite(creditNote) || creditNote < 0) {
            setFieldError("Credit note must be a non-negative number");
            return;
          }

          const linePayload: Array<{ id: number; credit_note: number }> = [];
          for (const line of lines) {
            const raw = (lineCredits[line.id] ?? "").trim();
            if (!raw) {
              setFieldError("Enter credit note for every line (use 0 if none)");
              return;
            }
            const parsed = Number(raw);
            if (!Number.isFinite(parsed) || parsed < 0) {
              setFieldError("Line credit notes must be non-negative numbers");
              return;
            }
            linePayload.push({
              id: line.id,
              credit_note: roundMoney(parsed),
            });
          }

          const sum = roundMoney(
            linePayload.reduce((total, line) => total + line.credit_note, 0),
          );
          if (sum !== roundMoney(creditNote)) {
            setFieldError(
              `Sum of credit note column (${sum.toFixed(2)}) must equal credit note (${roundMoney(creditNote).toFixed(2)})`,
            );
            return;
          }

          setFieldError(undefined);
          saveMutation.mutate({
            voucher_no: voucherNo,
            voucher_date: voucherDate,
            expenses,
            credit_note: roundMoney(creditNote),
            lines: linePayload,
          });
        })}
        footerMessage={fieldError}
        footer={
          <button
            type="submit"
            className={defaultWinForm.buttonPrimary}
            disabled={fieldsDisabled || isSubmitting || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Voucher no">
              <FormAutocomplete
                value={voucherValue}
                onChange={setVoucherValue}
                options={voucherOptions}
                placeholder="Search voucher"
                emptyMessage="No vouchers"
                disabled={vouchersQuery.isLoading}
                listClassName="voucher-ac-list"
                renderOption={renderVoucherOption}
              />
            </FormField>
            <FormField label="Voucher date">
              <FormInput
                type="text"
                readOnly
                value={
                  preview?.voucher_date
                    ? formatVoucherDate(preview.voucher_date)
                    : voucherDate
                      ? formatVoucherDate(voucherDate)
                      : ""
                }
                placeholder="—"
              />
            </FormField>
            <FormField label="Vendor">
              <FormInput
                type="text"
                readOnly
                value={preview?.vendor?.trim() || ""}
                placeholder="—"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Expenses">
              <FormInput
                type="text"
                inputMode="decimal"
                className="costing-credit-input"
                disabled={fieldsDisabled}
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                {...expensesRegister}
                onChange={(event) => {
                  event.target.value = sanitizeDecimalInput(event.target.value);
                  expensesRegister.onChange(event);
                }}
                onBlur={(event) => {
                  const formatted = formatDecimalDisplay(event.target.value);
                  event.target.value = formatted;
                  setValue("expenses", formatted, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  expensesRegister.onBlur(event);
                }}
                onKeyDown={blockNonDecimalKeyDown}
              />
            </FormField>
            <FormField label="Credit note">
              <FormInput
                type="text"
                inputMode="decimal"
                className="costing-credit-input"
                disabled={fieldsDisabled}
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                {...creditNoteRegister}
                onChange={(event) => {
                  event.target.value = sanitizeDecimalInput(event.target.value);
                  creditNoteRegister.onChange(event);
                }}
                onBlur={(event) => {
                  const formatted = formatDecimalDisplay(event.target.value);
                  event.target.value = formatted;
                  setValue("credit_note", formatted, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  creditNoteRegister.onBlur(event);
                }}
                onKeyDown={blockNonDecimalKeyDown}
              />
            </FormField>
          </div>
        </div>
      </FormPanel>

      <div className="app-table-wrap report-page__table mt-4">
        <div className="app-table-shell">
          <div className="app-table-scroll">
            {!voucherNo || !voucherDate ? (
              <p className="app-table-empty">Select a voucher to preview cost.</p>
            ) : previewQuery.isLoading ? (
              <p className="app-table-empty">Loading cost preview…</p>
            ) : previewQuery.isError ? (
              <p className="app-table-empty text-[var(--color-danger)]">
                {(previewQuery.error as Error).message || "Unable to load cost preview"}
              </p>
            ) : (
              <table className="app-table app-table--costing">
                <CostingTableColgroup />
                <thead>
                  <tr>
                    <th>Stock item</th>
                    <th className="app-table-num">Qty</th>
                    <th className="app-table-num">Box</th>
                    <th className="app-table-num">Amount</th>
                    <th className="app-table-num">Expenses</th>
                    <th className="app-table-num">Credit note</th>
                    <th className="app-table-num">Cost value</th>
                    <th className="app-table-num">Cost price</th>
                  </tr>
                </thead>
                <tbody>
                  {liveRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="app-table-empty">
                        No purchase lines for this voucher.
                      </td>
                    </tr>
                  ) : (
                    liveRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.stock_item || "—"}</td>
                        <td className="app-table-num">{formatQty(row.qty)}</td>
                        <td className="app-table-num">{formatMoney(row.box)}</td>
                        <td className="app-table-num">{formatMoney(row.amount)}</td>
                        <td className="app-table-num">{formatMoney(row.expenses)}</td>
                        <td className="app-table-num costing-credit-cell">
                          <FormInput
                            type="text"
                            inputMode="decimal"
                            className="costing-credit-input"
                            disabled={fieldsDisabled || saveMutation.isPending}
                            autoComplete="new-password"
                            data-1p-ignore
                            data-lpignore="true"
                            value={lineCredits[row.id] ?? ""}
                            onChange={(event) => {
                              const value = sanitizeDecimalInput(event.target.value);
                              setLineCredits((current) => ({
                                ...current,
                                [row.id]: value,
                              }));
                            }}
                            onBlur={() => {
                              setLineCredits((current) => ({
                                ...current,
                                [row.id]: formatDecimalDisplay(current[row.id] ?? ""),
                              }));
                            }}
                            onKeyDown={blockNonDecimalKeyDown}
                          />
                        </td>
                        <td className="app-table-num">{formatMoney(row.costValue)}</td>
                        <td className="app-table-num">{formatMoney(row.costPrice)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="app-table-foot app-table-foot--aligned">
            <table className="app-table app-table--costing">
              <CostingTableColgroup />
              <tbody>
                <tr>
                  <td>
                    <span className="app-table-foot-label">
                      {voucherNo && voucherDate
                        ? `${lines.length} line${lines.length === 1 ? "" : "s"}`
                        : "No voucher selected"}
                    </span>
                  </td>
                  <td className="app-table-num">
                    {voucherNo && voucherDate ? formatQty(liveTotals.qty) : "—"}
                  </td>
                  <td className="app-table-num">
                    {voucherNo && voucherDate ? formatMoney(liveTotals.boxes) : "—"}
                  </td>
                  <td className="app-table-num">
                    {voucherNo && voucherDate ? formatMoney(liveTotals.amount) : "—"}
                  </td>
                  <td />
                  <td
                    className={
                      creditMismatch
                        ? "app-table-num costing-credit-total costing-credit-mismatch"
                        : "app-table-num costing-credit-total"
                    }
                  >
                    {voucherNo && voucherDate ? formatMoney(lineCreditSum) : "—"}
                  </td>
                  <td className="app-table-num">
                    {voucherNo && voucherDate
                      ? formatMoney(liveTotals.cost_value)
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
