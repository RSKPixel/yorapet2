import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import type { SettingsTabId } from "@/contexts/SettingsContext";
import { useSettings } from "@/hooks/useSettings";

type OpenSettingsRouteProps = {
  tab?: SettingsTabId;
};

/** Opens the settings modal (optionally on a tab) then leaves the route. */
export function OpenSettingsRoute({ tab = "general" }: OpenSettingsRouteProps) {
  const { openSettings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    openSettings(tab);
    navigate("/", { replace: true });
  }, [openSettings, navigate, tab]);

  return <Navigate to="/" replace />;
}
