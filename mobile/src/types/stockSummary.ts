export type StockSummaryItem = {
  stock_item: string;
  stock_group: string | null;
  closing_qty: number;
  closing_rate: number | null;
  avg_selling_price: number | null;
  avg_weighted_age_days: number | null;
  closing_value: number | null;
  sales_30d_qty: number;
  reorder_level: number;
  days_cover: number | null;
  below_reorder: boolean;
};

export type StockSummaryResponse = {
  items: StockSummaryItem[];
};

export type StockSummaryActivityLine = {
  voucher_no: string | null;
  voucher_date: string | null;
  party: string | null;
  qty: number | null;
  purchased_qty?: number | null;
  rate: number | null;
  amount: number | null;
  discounted_rate?: number | null;
};

export type StockSummaryActivityResponse = {
  stock_item: string;
  closing_qty: number | null;
  purchases: StockSummaryActivityLine[];
  sales: StockSummaryActivityLine[];
};
