export type StockSummaryItem = {
  stock_item: string;
  stock_group: string | null;
  opening_qty: number;
  purchase_qty: number;
  sales_qty: number;
  closing_qty: number;
  closing_rate: number | null;
  closing_value: number | null;
  /** Sales qty in the last 30 days ending on as_on. */
  sales_30d_qty: number;
  /** Reorder threshold = 30-day sales qty. */
  reorder_level: number;
  /** Closing ÷ (30d sales / 30); null when no 30d sales. */
  days_cover: number | null;
  /** True when closing stock is below 30 days of sales. */
  below_reorder: boolean;
};

export type StockSummaryResponse = {
  as_on: string;
  items: StockSummaryItem[];
};
