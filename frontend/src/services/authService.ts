import { apiClient } from "@/services/apiClient";
import type { AuthUser, UpdateProfileInput } from "@/contexts/authTypes";
import type { AuthResponse } from "@/types/api";

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
    });
    return mapUser(data);
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthResponse>("/auth/me");
    return mapUser(data);
  },

  async updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
    const { data } = await apiClient.patch<AuthResponse>("/auth/me", {
      display_name: input.displayName,
      email: input.email,
      phone: input.phone,
    });
    return mapUser(data);
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthUser> {
    const { data } = await apiClient.post<AuthResponse>("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return mapUser(data);
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },
};
