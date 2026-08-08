export type PurchaseVoucherOption = {
  voucher_no: string;
  voucher_date: string | null;
  vendor: string | null;
};

export type PurchaseStockItemOption = {
  stock_item: string;
};

export type PurchaseExpense = {
  id: number;
  voucher_no: string;
  voucher_date: string | null;
  expenses: number | string;
  credit_note: number | string;
};

export type PurchaseCreditNote = {
  id: number;
  voucher_no: string;
  voucher_date: string | null;
  stock_item: string;
  credit_note: number | string;
};

export type PurchaseCostPreviewLine = {
  id: number;
  stock_item: string;
  qty: number | string | null;
  box: number | string | null;
  qty_per_box: number | string | null;
  amount: number | string | null;
  value_addition: number | string | null;
  credit_note: number | string;
  cost_value: number | string;
  cost_price: number | string | null;
};

export type PurchaseCostPreviewTotals = {
  qty: number | string;
  boxes: number | string;
  amount: number | string;
  credit_note: number | string;
  cost_value: number | string;
};

export type PurchaseCostPreview = {
  voucher_no: string;
  voucher_date: string | null;
  vendor: string | null;
  expenses: number | string;
  credit_note: number | string;
  lines: PurchaseCostPreviewLine[];
  totals: PurchaseCostPreviewTotals;
};

export type UpsertPurchaseCostingPayload = {
  voucher_no: string;
  voucher_date: string;
  expenses: number;
  credit_note: number;
  lines: Array<{ id: number; credit_note: number }>;
};
