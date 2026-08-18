import { apiClient } from "@/services/apiClient";
import type {
  InventoryMasterItem,
  InventoryMasterListResponse,
  UpsertInventoryExtraPayload,
} from "@/types/inventoryMaster";

export const inventoryMasterService = {
  async list(): Promise<InventoryMasterItem[]> {
    const { data } =
      await apiClient.get<InventoryMasterListResponse>("/inventory-master");
    return data.items;
  },

  async upsertExtra(
    payload: UpsertInventoryExtraPayload,
  ): Promise<InventoryMasterItem> {
    const { data } = await apiClient.put<InventoryMasterItem>(
      "/inventory-master",
      payload,
    );
    return data;
  },

  async uploadImage(stockItem: string, file: File): Promise<InventoryMasterItem> {
    const formData = new FormData();
    formData.append("stock_item", stockItem);
    formData.append("file", file);
    const { data } = await apiClient.post<InventoryMasterItem>(
      "/inventory-master/image",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  },

  async deleteImage(imageId: number): Promise<InventoryMasterItem> {
    const { data } = await apiClient.delete<InventoryMasterItem>(
      "/inventory-master/image",
      { params: { image_id: imageId } },
    );
    return data;
  },
};
