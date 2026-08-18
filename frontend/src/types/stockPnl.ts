export type StockPnlItem = {
  stock_item: string;
  stock_group: string | null;
  cost_price: number | null;
  avg_sell_price: number | null;
  /** Total sales qty (all available sales). */
  sell_qty: number;
  profit_per_unit: number | null;
  pnl_amount: number | null;
};

export type StockPnlResponse = {
  date_from: string | null;
  date_to: string | null;
  items: StockPnlItem[];
};

export type StockPnlQuery = {
  dateFrom?: string;
  dateTo?: string;
};
