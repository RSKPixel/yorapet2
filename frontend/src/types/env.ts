export type AppEnvironment = {
  appName: string;
  appVersion: string;
  apiBaseUrl: string;
  enableApiHealthCheck: boolean;
};

function readBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") {
    return fallback;
  }
  return value.toLowerCase() === "true" || value === "1";
}

export const env: AppEnvironment = {
  appName: import.meta.env.VITE_APP_NAME || "YORA PET",
  appVersion: import.meta.env.VITE_APP_VERSION || "0.1.0",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  enableApiHealthCheck: readBoolean(import.meta.env.VITE_ENABLE_API_HEALTH_CHECK, true),
};
