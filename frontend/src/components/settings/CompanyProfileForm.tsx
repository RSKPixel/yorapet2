import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  CompanyProfileIcon,
  FormInput,
  FormPanel,
  FormTextarea,
  defaultWinForm,
} from "@/components/forms";
import { useAuth } from "@/hooks/useAuth";
import { useFormMessage } from "@/hooks/useFormMessage";
import {
  companyProfileService,
  type CompanyProfile,
} from "@/services/companyProfileService";

const companyProfileSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(160, "Company name is too long"),
  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(500, "Address is too long"),
  area: z.string().trim().min(1, "Area is required").max(120, "Area is too long"),
  city: z.string().trim().min(1, "City is required").max(120, "City is too long"),
  pin: z
    .string()
    .trim()
    .min(1, "PIN is required")
    .max(20, "PIN is too long")
    .regex(/^[0-9A-Za-z -]{3,20}$/, "Enter a valid PIN"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .refine(
      (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address",
    ),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .refine(
      (value) => /^[0-9+\-\s().]{7,32}$/.test(value),
      "Enter a valid phone number",
    ),
  gstin: z
    .string()
    .trim()
    .min(1, "GSTIN is required")
    .max(32, "GSTIN is too long")
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .refine((value) => /^[0-9A-Z]{1,32}$/.test(value), "Enter a valid GSTIN"),
});

type CompanyProfileValues = z.infer<typeof companyProfileSchema>;

const emptyValues: CompanyProfileValues = {
  companyName: "",
  address: "",
  area: "",
  city: "",
  pin: "",
  email: "",
  phone: "",
  gstin: "",
};

function toFormValues(profile: CompanyProfile): CompanyProfileValues {
  return {
    companyName: profile.companyName,
    address: profile.address,
    area: profile.area,
    city: profile.city,
    pin: profile.pin,
    email: profile.email,
    phone: profile.phone,
    gstin: profile.gstin,
  };
}

export function CompanyProfileForm() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { showError, showSuccess } = useFormMessage();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["company-profile"],
    queryFn: () => companyProfileService.getProfile(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CompanyProfileValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (profileQuery.data) {
      reset(toFormValues(profileQuery.data));
    }
  }, [profileQuery.data, reset]);

  const validationMessage =
    errors.companyName?.message ??
    errors.address?.message ??
    errors.area?.message ??
    errors.city?.message ??
    errors.pin?.message ??
    errors.email?.message ??
    errors.phone?.message ??
    errors.gstin?.message;

  const updateMutation = useMutation({
    mutationFn: companyProfileService.updateProfile,
    onSuccess: async (profile) => {
      queryClient.setQueryData(["company-profile"], profile);
      await queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      reset(toFormValues(profile));
      showSuccess("Company profile updated successfully.");
    },
    onError: (error: Error) => {
      showError(error.message || "Unable to update company profile");
    },
  });

  return (
    <FormPanel
      title="Company Profile"
      titleIcon={CompanyProfileIcon}
      hideHeader
      wide
      onSubmit={handleSubmit((values) => {
        if (!isAdmin) {
          return;
        }
        updateMutation.mutate({
          company_name: values.companyName,
          address: values.address,
          area: values.area,
          city: values.city,
          pin: values.pin,
          email: values.email,
          phone: values.phone,
          gstin: values.gstin,
        });
      })}
      footerMessage={validationMessage}
      footer={
        isAdmin ? (
          <button
            type="submit"
            disabled={
              profileQuery.isLoading ||
              isSubmitting ||
              updateMutation.isPending ||
              !isDirty
            }
            className={defaultWinForm.buttonPrimary}
          >
            {updateMutation.isPending ? "Saving…" : "Save company profile"}
          </button>
        ) : undefined
      }
    >
      {profileQuery.isLoading ? (
        <p className="text-[0.875rem] text-[var(--color-muted)]">
          Loading company profile…
        </p>
      ) : profileQuery.isError ? (
        <p className="text-[0.875rem] text-[var(--color-danger)]" role="alert">
          {(profileQuery.error as Error).message}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-[0.875rem] text-[var(--color-muted)]">
            {isAdmin
              ? "Update the company details used across the application."
              : "Only administrators can modify the company profile."}
          </p>

          <div className="grid gap-x-3 sm:grid-cols-2">
            <FormInput
              label="Company name"
              autoComplete="one-time-code"
              error={errors.companyName?.message}
              hideErrorText
              readOnly={!isAdmin}
              {...register("companyName")}
            />
            <FormInput
              label="Area"
              autoComplete="one-time-code"
              error={errors.area?.message}
              hideErrorText
              readOnly={!isAdmin}
              {...register("area")}
            />
          </div>

          <FormTextarea
            label="Address"
            rows={3}
            autoComplete="one-time-code"
            error={errors.address?.message}
            hideErrorText
            readOnly={!isAdmin}
            {...register("address")}
          />

          <div className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput
              label="City"
              autoComplete="one-time-code"
              error={errors.city?.message}
              hideErrorText
              readOnly={!isAdmin}
              {...register("city")}
            />
            <FormInput
              label="PIN"
              inputMode="numeric"
              autoComplete="one-time-code"
              error={errors.pin?.message}
              hideErrorText
              readOnly={!isAdmin}
              {...register("pin")}
            />
            <FormInput
              label="GSTIN"
              autoComplete="one-time-code"
              error={errors.gstin?.message}
              hideErrorText
              readOnly={!isAdmin}
              {...register("gstin")}
            />
          </div>

          <div className="grid gap-x-3 sm:grid-cols-2">
            <FormInput
              label="Email"
              type="text"
              inputMode="email"
              autoComplete="one-time-code"
              error={errors.email?.message}
              hideErrorText
              readOnly={!isAdmin}
              {...register("email")}
            />
            <FormInput
              label="Phone"
              type="text"
              inputMode="tel"
              autoComplete="one-time-code"
              error={errors.phone?.message}
              hideErrorText
              readOnly={!isAdmin}
              {...register("phone")}
            />
          </div>
        </div>
      )}
    </FormPanel>
  );
}
