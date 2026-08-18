import { apiClient } from "@/api/client";
import type { SaleLineResponse, SaleListResponse } from "@/types/sales";

export const salesService = {
  async listSales(): Promise<SaleLineResponse[]> {
    const { data } = await apiClient.get<SaleListResponse>("/sales");
    return data.items;
  },
};
