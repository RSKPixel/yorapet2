import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppRouter } from "@/App";
import { FormMessageProvider } from "@/components/forms";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { queryClient } from "@/services/queryClient";
import { env } from "@/types/env";
import { getAppTitle } from "@/utils/appTitle";

import "./index.css";

document.title = getAppTitle();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FormMessageProvider>
          <AuthProvider>
            <SettingsProvider>
              <AppRouter />
            </SettingsProvider>
          </AuthProvider>
        </FormMessageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);

if (import.meta.env.DEV) {
  console.info(`${env.appName} frontend started`);
}
