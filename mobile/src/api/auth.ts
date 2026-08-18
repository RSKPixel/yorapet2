import { apiClient } from "@/api/client";
import { tokenStorage } from "@/auth/tokenStorage";
import type { AuthResponse, AuthUser } from "@/types/api";

function mapUser(response: AuthResponse): AuthUser {
  return {
    id: response.user.id,
    username: response.user.username,
    displayName: response.user.display_name,
    email: response.user.email ?? null,
    phone: response.user.phone ?? null,
    role: response.user.role,
    lastLoginAt: response.user.last_login_at,
  };
}

export const authService = {
  async login(username: string, password: string): Promise<AuthUser> {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", {
      username,
      password,
      delivery: "bearer",
    });

    if (!data.access_token || !data.refresh_token) {
      throw new Error("Login did not return bearer tokens");
    }

    await tokenStorage.set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });

    return mapUser(data);
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthResponse>("/auth/me");
    return mapUser(data);
  },

  async logout(): Promise<void> {
    const tokens = await tokenStorage.get();
    try {
      if (tokens?.refreshToken) {
        await apiClient.post(
          "/auth/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${tokens.refreshToken}`,
            },
          },
        );
      }
    } finally {
      await tokenStorage.clear();
    }
  },
};
