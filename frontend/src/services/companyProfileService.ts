import { apiClient } from "@/services/apiClient";
import type {
  CompanyProfileResponse,
  UpdateCompanyProfileRequest,
} from "@/types/api";

export type CompanyProfile = {
  id: number;
  companyName: string;
  address: string;
  area: string;
  city: string;
  pin: string;
  email: string;
  phone: string;
  gstin: string;
  createdAt: string;
  updatedAt: string;
};

function mapCompanyProfile(data: CompanyProfileResponse): CompanyProfile {
  return {
    id: data.id,
    companyName: data.company_name,
    address: data.address,
    area: data.area,
    city: data.city,
    pin: data.pin,
    email: data.email,
    phone: data.phone,
    gstin: data.gstin,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export const companyProfileService = {
  async getProfile(): Promise<CompanyProfile> {
    const { data } = await apiClient.get<CompanyProfileResponse>("/company-profile");
    return mapCompanyProfile(data);
  },

  async updateProfile(
    payload: UpdateCompanyProfileRequest,
  ): Promise<CompanyProfile> {
    const { data } = await apiClient.patch<CompanyProfileResponse>(
      "/company-profile",
      payload,
    );
    return mapCompanyProfile(data);
  },
};
