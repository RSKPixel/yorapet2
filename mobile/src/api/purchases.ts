import { apiClient } from "@/api/client";
import type {
  PurchaseLineResponse,
  PurchaseListResponse,
} from "@/types/purchases";

export const purchasesService = {
  async listPurchases(): Promise<PurchaseLineResponse[]> {
    const { data } = await apiClient.get<PurchaseListResponse>("/purchases");
    return data.items;
  },
};
