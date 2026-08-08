import { apiClient } from "@/services/apiClient";
import type { TallySyncSessionResponse } from "@/types/tallyData";

export const tallyDataService = {
  async sync(): Promise<TallySyncSessionResponse> {
    const { data } = await apiClient.post<TallySyncSessionResponse>(
      "/tally-data/sync",
    );
    return data;
  },
};
