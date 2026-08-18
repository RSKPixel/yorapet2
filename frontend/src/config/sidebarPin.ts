export const SIDEBAR_PIN_STORAGE_KEY = "yorapet_sidebar_pinned";

export function readSidebarPinned(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY) === "true";
}

export function writeSidebarPinned(pinned: boolean): void {
  window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, pinned ? "true" : "false");
}
