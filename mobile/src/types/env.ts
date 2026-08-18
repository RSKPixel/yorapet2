export type AppEnvironment = {
  appName: string;
  apiBaseUrl: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * API base URL for the FastAPI /api/v1 prefix.
 *
 * Defaults:
 * - iOS Simulator / web: http://127.0.0.1:8000/api/v1
 * - Android emulator: use http://10.0.2.2:8000/api/v1 in .env
 * - Physical device: use your machine LAN IP
 */
export const env: AppEnvironment = {
  appName: "YoraPet",
  apiBaseUrl: trimTrailingSlash(
    process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1",
  ),
};
