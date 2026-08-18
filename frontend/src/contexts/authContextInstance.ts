import { createContext } from "react";

import type { AuthContextValue } from "@/contexts/authTypes";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
