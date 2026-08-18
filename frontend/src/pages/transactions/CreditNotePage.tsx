import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  renderVoucherOption,
  toVoucherOptions,
} from "@/pages/transactions/voucherOptions";
import { purchaseCostingService } from "@/services/purchaseCostingService";

const creditNoteSchema = z.object({
  credit_note: z.string(),
});

type CreditNoteValues = z.infer<typeof creditNoteSchema>;

export function CreditNotePage() {
  const { showError, showSuccess } = useFormMessage();
  const [voucherValue, setVoucherValue] = useState("");
  const [stockItem, setStockItem] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();

  const selected = useMemo(() => decodeVoucherValue(voucherValue), [voucherValue]);
  const voucherNo = selected.voucher_no;
  const voucherDate = selected.voucher_date;

  const vouchersQuery = useQuery({
    queryKey: ["purchase-costing", "vouchers"],
    queryFn: () => purchaseCostingService.listVouchers(),
  });

  const stockItemsQuery = useQuery({
    queryKey: ["purchase-costing", "stock-items", voucherNo, voucherDate],
    queryFn: () => purchaseCostingService.listStockItems(voucherNo, voucherDate),
    enabled: Boolean(voucherNo && voucherDate),
  });

  const creditQuery = useQuery({
    queryKey: ["purchase-costing", "credit-note", voucherNo, voucherDate, stockItem],
    queryFn: () =>
      purchaseCostingService.getCreditNote(voucherNo, voucherDate, stockItem),
    enabled: Boolean(voucherNo && voucherDate && stockItem),
  });

  const voucherOptions = useMemo(
    () => toVoucherOptions(vouchersQuery.data ?? []),
    [vouchersQuery.data],
  );

  const stockItemOptions = useMemo(
    () =>
      (stockItemsQuery.data ?? []).map((item) => ({
        value: item.stock_item,
        label: item.stock_item,
      })),
    [stockItemsQuery.data],
  );

  useEffect(() => {
    setStockItem("");
  }, [voucherValue]);

  useEffect(() => {
    if (stockItem && !stockItemOptions.some((option) => option.value === stockItem)) {
      setStockItem("");
    }
  }, [stockItem, stockItemOptions]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreditNoteValues>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: { credit_note: "" },
  });

  useEffect(() => {
    setFieldError(undefined);
    if (!voucherNo || !voucherDate || !stockItem) {
      reset({ credit_note: "" });
      return;
    }
    const credit = creditQuery.data?.credit_note;
    reset({
      credit_note: credit === null || credit === undefined ? "" : String(credit),
    });
  }, [voucherNo, voucherDate, stockItem, creditQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: purchaseCostingService.upsertCreditNote,
    onSuccess: async () => {
      showSuccess("Credit note saved. Cost price updated.");
      await creditQuery.refetch();
    },
    onError: (error: Error) => {
      showError(error.message || "Unable to save credit note");
    },
  });

  const fieldsDisabled =
    !voucherNo ||
    !voucherDate ||
    !stockItem ||
    vouchersQuery.isLoading ||
    stockItemsQuery.isLoading;

  return (
    <section>
      <PageHeader
        items={[
          { label: "Transactions" },
          { label: "Credit Note", to: "/transactions/credit-note" },
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
          if (!stockItem) {
            setFieldError("Select a stock item");
            return;
          }
          const trimmed = values.credit_note.trim();
          if (!trimmed) {
            setFieldError("Credit note is required");
            return;
          }
          const parsed = Number(trimmed);
          if (!Number.isFinite(parsed) || parsed < 0) {
            setFieldError("Credit note must be a non-negative number");
            return;
          }
          setFieldError(undefined);
          saveMutation.mutate({
            voucher_no: voucherNo,
            voucher_date: voucherDate,
            stock_item: stockItem,
            credit_note: parsed,
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
        <div className="grid gap-4 sm:grid-cols-2">
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
          <FormField label="Stock item">
            <FormAutocomplete
              value={stockItem}
              onChange={setStockItem}
              options={stockItemOptions}
              placeholder="Search stock item"
              emptyMessage="No stock items"
              disabled={!voucherNo || !voucherDate || stockItemsQuery.isLoading}
            />
          </FormField>
          <FormField label="Credit note">
            <FormInput
              type="text"
              inputMode="decimal"
              disabled={fieldsDisabled}
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              {...register("credit_note")}
            />
          </FormField>
        </div>
      </FormPanel>
    </section>
  );
}
