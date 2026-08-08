import { useContext } from "react";

import { AuthContext } from "@/contexts/authContextInstance";
import type { AuthContextValue } from "@/contexts/authTypes";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
