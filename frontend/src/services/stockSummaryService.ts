import { apiClient } from "@/services/apiClient";
import type {
  StockSummaryActivityResponse,
  StockSummaryItem,
  StockSummaryResponse,
} from "@/types/stockSummary";

export type StockSummaryLine = StockSummaryItem;

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
