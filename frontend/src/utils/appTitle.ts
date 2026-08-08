import { env } from "@/types/env";

export function getAppTitle(pageTitle?: string): string {
  if (!pageTitle) {
    return env.appName;
  }
  return `${pageTitle} · ${env.appName}`;
}
