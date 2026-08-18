import type { FormDropdownOption } from "@/components/forms";
import type { PurchaseVoucherOption } from "@/types/purchaseCosting";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const VOUCHER_VALUE_SEP = "||";

export function formatVoucherDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return dateFormatter.format(date);
}

function formatText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

/** ISO date (YYYY-MM-DD) for API params; empty when missing. */
export function toVoucherDateParam(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export function encodeVoucherValue(
  voucherNo: string,
  voucherDate: string | null | undefined,
): string {
  return `${voucherNo}${VOUCHER_VALUE_SEP}${toVoucherDateParam(voucherDate)}`;
}

export function decodeVoucherValue(value: string): {
  voucher_no: string;
  voucher_date: string;
} {
  const sep = value.indexOf(VOUCHER_VALUE_SEP);
  if (sep < 0) {
    return { voucher_no: value, voucher_date: "" };
  }
  return {
    voucher_no: value.slice(0, sep),
    voucher_date: value.slice(sep + VOUCHER_VALUE_SEP.length),
  };
}

export function toVoucherOptions(items: PurchaseVoucherOption[]): FormDropdownOption[] {
  return items.map((item) => {
    const dateLabel = formatVoucherDate(item.voucher_date);
    const vendorLabel = formatText(item.vendor);
    const vendor = item.vendor?.trim() ?? "";
    return {
      value: encodeVoucherValue(item.voucher_no, item.voucher_date),
      label: item.voucher_no,
      secondary: dateLabel,
      tertiary: vendorLabel,
      // Search by voucher no or vendor only
      searchText: `${item.voucher_no} ${vendor}`,
    };
  });
}

export function renderVoucherOption(option: FormDropdownOption) {
  return (
    <span className="voucher-ac-option">
      <span className="voucher-ac-option__no">{option.label}</span>
      <span className="voucher-ac-option__date">{option.secondary ?? "—"}</span>
      <span className="voucher-ac-option__vendor">{option.tertiary ?? "—"}</span>
    </span>
  );
}
