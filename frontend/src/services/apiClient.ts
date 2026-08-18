import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "@/types/env";
import type { ApiErrorResponse } from "@/types/api";

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  try {
    await apiClient.post("/auth/refresh");
    return true;
  } catch {
    return false;
  }
}

function getErrorMessage(error: AxiosError<ApiErrorResponse>): string {
  return (
    error.response?.data?.error?.message || error.message || "Unexpected API error"
  );
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.endsWith("/auth/login") &&
      !originalRequest.url?.endsWith("/auth/refresh") &&
      !originalRequest.url?.endsWith("/auth/logout") &&
      !originalRequest.url?.endsWith("/auth/change-password")
    ) {
      originalRequest._retry = true;

      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });

      const refreshed = await refreshPromise;
      if (refreshed) {
        return apiClient(originalRequest);
      }

      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    return Promise.reject(new Error(getErrorMessage(error)));
  },
);
