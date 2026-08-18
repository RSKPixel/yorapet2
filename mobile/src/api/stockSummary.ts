import { apiClient } from "@/api/client";
import type {
  StockSummaryActivityResponse,
  StockSummaryResponse,
} from "@/types/stockSummary";

export const stockSummaryService = {
  async getSummary(): Promise<StockSummaryResponse> {
    const { data } = await apiClient.get<StockSummaryResponse>("/stock-summary");
    return data;
  },

  async getActivity(stockItem: string): Promise<StockSummaryActivityResponse> {
    const { data } = await apiClient.get<StockSummaryActivityResponse>(
      "/stock-summary/activity",
      { params: { stock_item: stockItem } },
    );
    return data;
  },
};
