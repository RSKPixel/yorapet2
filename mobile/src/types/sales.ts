export type SaleLineResponse = {
  id: number;
  sync_key: string;
  voucher_no: string | null;
  voucher_date: string | null;
  ledger_name: string | null;
  broker: string | null;
  item_count: number | null;
  item_no: number | null;
  stock_item: string | null;
  brand: string | null;
  packing: number | null;
  qty: number | null;
  rate: number | null;
  amount: number | null;
  discount: number | null;
  cartage: string | null;
  synced_at: string;
};

export type SaleListResponse = {
  items: SaleLineResponse[];
};
