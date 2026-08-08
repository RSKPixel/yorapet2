import { apiClient } from "@/services/apiClient";
import type {
  CreateUserRequest,
  ManagedUserResponse,
  UpdateUserRequest,
  UserListResponse,
} from "@/types/api";

export type ManagedUser = {
  id: number;
  username: string;
  displayName: string;
  role: "admin" | "user" | string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

function mapUser(user: ManagedUserResponse): ManagedUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}

export const userService = {
  async listUsers(): Promise<ManagedUser[]> {
    const { data } = await apiClient.get<UserListResponse>("/users");
    return data.items.map(mapUser);
  },

  async createUser(payload: CreateUserRequest): Promise<ManagedUser> {
    const { data } = await apiClient.post<ManagedUserResponse>(
      "/users",
      payload,
    );
    return mapUser(data);
  },

  async updateUser(
    userId: number,
    payload: UpdateUserRequest,
  ): Promise<ManagedUser> {
    const { data } = await apiClient.patch<ManagedUserResponse>(
      `/users/${userId}`,
      payload,
    );
    return mapUser(data);
  },
};
