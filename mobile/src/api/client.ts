import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { tokenStorage } from "@/auth/tokenStorage";
import type { ApiErrorResponse, AuthResponse } from "@/types/api";
import { env } from "@/types/env";

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function getErrorMessage(error: AxiosError<ApiErrorResponse>): string {
  return (
    error.response?.data?.error?.message || error.message || "Unexpected API error"
  );
}

async function refreshSession(): Promise<boolean> {
  const tokens = await tokenStorage.get();
  if (!tokens?.refreshToken) {
    return false;
  }

  try {
    const { data } = await axios.post<AuthResponse>(
      `${env.apiBaseUrl}/auth/refresh`,
      {},
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.refreshToken}`,
        },
      },
    );
    if (!data.access_token || !data.refresh_token) {
      return false;
    }
    await tokenStorage.set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
    return true;
  } catch {
    return false;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const existing = config.headers.Authorization;
  if (!existing) {
    const tokens = await tokenStorage.get();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  }
  return config;
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
      !originalRequest.url?.endsWith("/auth/logout")
    ) {
      originalRequest._retry = true;

      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });

      const refreshed = await refreshPromise;
      if (refreshed) {
        const tokens = await tokenStorage.get();
        if (tokens?.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return apiClient(originalRequest);
      }

      await tokenStorage.clear();
      onUnauthorized?.();
    }

    return Promise.reject(new Error(getErrorMessage(error)));
  },
);
