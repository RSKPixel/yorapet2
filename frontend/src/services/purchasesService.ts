import { apiClient } from "@/services/apiClient";
import type {
  PurchaseLineResponse,
  PurchaseListResponse,
} from "@/types/purchases";

export type PurchaseLine = PurchaseLineResponse;

export const purchasesService = {
  async listPurchases(): Promise<PurchaseLine[]> {
    const { data } = await apiClient.get<PurchaseListResponse>("/purchases");
    return data.items;
  },
};
