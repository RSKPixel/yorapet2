export type StockSummaryItem = {
  stock_item: string;
  stock_group: string | null;
  opening_qty: number;
  purchase_qty: number;
  sales_qty: number;
  closing_qty: number;
  closing_rate: number | null;
  closing_value: number | null;
};

export type StockSummaryResponse = {
  as_on: string;
  items: StockSummaryItem[];
};
