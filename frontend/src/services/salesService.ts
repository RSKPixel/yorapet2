import { apiClient } from "@/services/apiClient";
import type { SaleLineResponse, SaleListResponse } from "@/types/sales";

export type SaleLine = SaleLineResponse;

export const salesService = {
  async listSales(): Promise<SaleLine[]> {
    const { data } = await apiClient.get<SaleListResponse>("/sales");
    return data.items;
  },
};
