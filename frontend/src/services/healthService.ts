import { apiClient } from "@/services/apiClient";
import type { HealthLiveResponse, HealthReadyResponse } from "@/types/api";

export async function getLiveHealth(): Promise<HealthLiveResponse> {
  const response = await apiClient.get<HealthLiveResponse>("/health/live");
  return response.data;
}

export async function getReadyHealth(): Promise<HealthReadyResponse> {
  const response = await apiClient.get<HealthReadyResponse>("/health/ready");
  return response.data;
}
