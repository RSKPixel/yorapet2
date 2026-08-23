import { apiClient } from "@/services/apiClient";
import type { CostCentreItem, CostCentreListResponse } from "@/types/costCentre";

/** Tally parent for blow moulding machines. */
export const BLOW_MACHINE_PARENT = "Blow Mould Machine";

export const costCentreService = {
  async list(parent: string = BLOW_MACHINE_PARENT): Promise<CostCentreItem[]> {
    const { data } = await apiClient.get<CostCentreListResponse>("/cost-centres", {
      params: { parent },
    });
    return data.items;
  },
};
