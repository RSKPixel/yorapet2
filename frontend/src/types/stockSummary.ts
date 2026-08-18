export type StockSummaryItem = {
  stock_item: string;
  stock_group: string | null;
  closing_qty: number;
  closing_rate: number | null;
  avg_selling_price: number | null;
  /** Qty-weighted average age (days) of FIFO remaining stock. */
  avg_weighted_age_days: number | null;
  closing_value: number | null;
  /** Sales qty in the last 30 days. */
  sales_30d_qty: number;
  /** Reorder threshold = 30-day sales qty. */
  reorder_level: number;
  /** Closing ÷ (30d sales / 30); null when no 30d sales. */
  days_cover: number | null;
  /** True when closing stock is below 30 days of sales. */
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
  /** Original purchase line qty (purchases in closing stock only). */
  purchased_qty?: number | null;
  rate: number | null;
  amount: number | null;
  /** Purchases only: value ÷ qty. */
  discounted_rate?: number | null;
};

export type StockSummaryActivityResponse = {
  stock_item: string;
  closing_qty: number | null;
  purchases: StockSummaryActivityLine[];
  sales: StockSummaryActivityLine[];
};
