import { apiClient } from "@/services/apiClient";
import type {
  PurchaseCostPreview,
  PurchaseCreditNote,
  PurchaseExpense,
  PurchaseStockItemOption,
  PurchaseVoucherOption,
  UpsertPurchaseCostingPayload,
} from "@/types/purchaseCosting";

type ListResponse<T> = { items: T[] };

export const purchaseCostingService = {
  async listVouchers(): Promise<PurchaseVoucherOption[]> {
    const { data } = await apiClient.get<ListResponse<PurchaseVoucherOption>>(
      "/purchase-costing/vouchers",
    );
    return data.items;
  },

  async listStockItems(
    voucherNo: string,
    voucherDate: string,
  ): Promise<PurchaseStockItemOption[]> {
    const { data } = await apiClient.get<ListResponse<PurchaseStockItemOption>>(
      "/purchase-costing/stock-items",
      {
        params: {
          voucher_no: voucherNo,
          voucher_date: voucherDate || undefined,
        },
      },
    );
    return data.items;
  },

  async getExpense(
    voucherNo: string,
    voucherDate: string,
  ): Promise<PurchaseExpense | null> {
    const { data } = await apiClient.get<PurchaseExpense | null>(
      "/purchase-costing/expenses/by-voucher",
      {
        params: {
          voucher_no: voucherNo,
          voucher_date: voucherDate || undefined,
        },
      },
    );
    return data;
  },

  async upsertCosting(
    payload: UpsertPurchaseCostingPayload,
  ): Promise<PurchaseCostPreview> {
    const { data } = await apiClient.put<PurchaseCostPreview>(
      "/purchase-costing",
      payload,
    );
    return data;
  },

  async getCreditNote(
    voucherNo: string,
    voucherDate: string,
    stockItem: string,
  ): Promise<PurchaseCreditNote | null> {
    const { data } = await apiClient.get<PurchaseCreditNote | null>(
      "/purchase-costing/credit-notes/by-voucher-item",
      {
        params: {
          voucher_no: voucherNo,
          voucher_date: voucherDate || undefined,
          stock_item: stockItem,
        },
      },
    );
    return data;
  },

  async upsertCreditNote(payload: {
    voucher_no: string;
    voucher_date: string;
    stock_item: string;
    credit_note: number;
  }): Promise<PurchaseCreditNote> {
    const { data } = await apiClient.put<PurchaseCreditNote>(
      "/purchase-costing/credit-notes",
      payload,
    );
    return data;
  },

  async preview(
    voucherNo: string,
    voucherDate: string,
  ): Promise<PurchaseCostPreview> {
    const { data } = await apiClient.get<PurchaseCostPreview>(
      "/purchase-costing/preview",
      {
        params: {
          voucher_no: voucherNo,
          voucher_date: voucherDate || undefined,
        },
      },
    );
    return data;
  },
};
