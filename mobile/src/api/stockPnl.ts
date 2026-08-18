import { apiClient } from "@/api/client";
import type { StockPnlQuery, StockPnlResponse } from "@/types/stockPnl";

export const stockPnlService = {
  async getPnl(query: StockPnlQuery = {}): Promise<StockPnlResponse> {
    const params: Record<string, string> = {};
    if (query.dateFrom) {
      params.date_from = query.dateFrom;
    }
    if (query.dateTo) {
      params.date_to = query.dateTo;
    }
    const { data } = await apiClient.get<StockPnlResponse>("/stock-summary/pnl", {
      params,
    });
    return data;
  },
};
