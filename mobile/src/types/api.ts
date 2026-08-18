export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  error: ApiErrorBody;
  request_id?: string;
};

export type AuthUserResponse = {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  last_login_at: string | null;
};

export type AuthResponse = {
  user: AuthUserResponse;
  access_token?: string | null;
  refresh_token?: string | null;
  token_type?: "bearer" | null;
};

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: string;
  lastLoginAt: string | null;
};
