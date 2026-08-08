import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { SettingsModal } from "@/components/settings/SettingsModal";

export type SettingsTabId =
  | "general"
  | "companyProfile"
  | "profile"
  | "password"
  | "users";

type SettingsContextValue = {
  isOpen: boolean;
  openSettings: (tab?: SettingsTabId) => void;
  closeSettings: () => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

type SettingsProviderProps = {
  children: ReactNode;
};

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<SettingsTabId>("general");

  const openSettings = useCallback((tab: SettingsTabId = "general") => {
    setInitialTab(tab);
    setIsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openSettings,
      closeSettings,
    }),
    [isOpen, openSettings, closeSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
      {isOpen ? (
        <SettingsModal onClose={closeSettings} initialTab={initialTab} />
      ) : null}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
