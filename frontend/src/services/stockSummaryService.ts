import { apiClient } from "@/services/apiClient";
import type {
  StockSummaryItem,
  StockSummaryResponse,
} from "@/types/stockSummary";

export type StockSummaryLine = StockSummaryItem;

export const stockSummaryService = {
  async getSummary(params: { asOn: string }): Promise<StockSummaryResponse> {
    const { data } = await apiClient.get<StockSummaryResponse>(
      "/stock-summary",
      {
        params: {
          as_on: params.asOn,
        },
      },
    );
    return data;
  },
};
