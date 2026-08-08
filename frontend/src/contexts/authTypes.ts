export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: string;
  lastLoginAt: string | null;
};

export type UpdateProfileInput = {
  displayName: string;
  email: string | null;
  phone: string | null;
};

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
};
