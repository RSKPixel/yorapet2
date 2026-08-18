import { Redirect } from "expo-router";

import { useAuth } from "@/auth/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/sales" />;
  }

  return <Redirect href="/login" />;
}
