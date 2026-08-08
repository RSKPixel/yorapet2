export type PurchaseLineResponse = {
  id: number;
  sync_key: string;
  voucher_no: string | null;
  voucher_date: string | null;
  ledger_name: string | null;
  broker: string | null;
  item_count: number | null;
  itemno: number | null;
  stock_item: string | null;
  brand: string | null;
  packing: number | null;
  qty: number | null;
  weight: number | null;
  rate: number | null;
  amount: number | null;
  synced_at: string;
};

export type PurchaseListResponse = {
  items: PurchaseLineResponse[];
};
