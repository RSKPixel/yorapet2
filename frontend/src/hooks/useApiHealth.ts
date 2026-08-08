import { useQuery } from "@tanstack/react-query";

import { getLiveHealth, getReadyHealth } from "@/services/healthService";
import { env } from "@/types/env";

export function useApiHealth(enabled = env.enableApiHealthCheck) {
  const liveQuery = useQuery({
    queryKey: ["health", "live"],
    queryFn: getLiveHealth,
    enabled,
  });

  const readyQuery = useQuery({
    queryKey: ["health", "ready"],
    queryFn: getReadyHealth,
    enabled,
    retry: false,
  });

  return { liveQuery, readyQuery };
}
