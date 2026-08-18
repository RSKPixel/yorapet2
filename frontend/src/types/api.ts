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
  /** Present when login/refresh used delivery=bearer (mobile clients). */
  access_token?: string | null;
  refresh_token?: string | null;
  token_type?: "bearer" | null;
};

export type UpdateProfileRequest = {
  display_name: string;
  email: string | null;
  phone: string | null;
};

export type CompanyProfileResponse = {
  id: number;
  company_name: string;
  address: string;
  area: string;
  city: string;
  pin: string;
  email: string;
  phone: string;
  gstin: string;
  created_at: string;
  updated_at: string;
};

export type UpdateCompanyProfileRequest = {
  company_name: string;
  address: string;
  area: string;
  city: string;
  pin: string;
  email: string;
  phone: string;
  gstin: string;
};

export type ManagedUserResponse = {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

export type UserListResponse = {
  items: ManagedUserResponse[];
};

export type CreateUserRequest = {
  username: string;
  display_name: string;
  password: string;
  role: "admin" | "user";
  is_active: boolean;
};

export type UpdateUserRequest = {
  role: "admin" | "user";
  is_active: boolean;
};

export type HealthLiveResponse = {
  status: "ok";
  service: string;
  version: string;
  environment: string;
};

export type HealthReadyResponse = {
  status: "ready" | "not_ready";
  service: string;
  version: string;
  environment: string;
  database: "up" | "down";
  detail?: string | null;
};
