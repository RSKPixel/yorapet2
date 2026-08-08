import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormInput, FormPanel, defaultWinForm } from "@/components/forms";
import { UserCircleIcon } from "@/components/forms/formIcons";
import { useAuth } from "@/hooks/useAuth";
import { useFormMessage } from "@/hooks/useFormMessage";

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(120, "Display name is too long"),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address",
    ),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[0-9+\-\s().]{7,32}$/.test(value),
      "Enter a valid phone number",
    ),
});

type ProfileValues = z.infer<typeof profileSchema>;

function initialsFromName(name: string | undefined, fallback: string) {
  const source = (name || fallback).trim();
  if (!source) {
    return "?";
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const { showError, showSuccess } = useFormMessage();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    },
  });

  const watchedDisplayName = watch("displayName");
  const avatarInitials = useMemo(
    () => initialsFromName(watchedDisplayName, user?.username ?? ""),
    [watchedDisplayName, user?.username],
  );

  useEffect(() => {
    reset({
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    });
  }, [user?.displayName, user?.email, user?.phone, reset]);

  const validationMessage =
    errors.displayName?.message ??
    errors.email?.message ??
    errors.phone?.message;

  return (
    <FormPanel
      title="Profile"
      titleIcon={UserCircleIcon}
      hideHeader
      wide
      onSubmit={handleSubmit(async (values) => {
        try {
          await updateProfile({
            displayName: values.displayName.trim(),
            email: values.email.trim() || null,
            phone: values.phone.trim() || null,
          });
          showSuccess("Profile updated successfully.");
        } catch (error) {
          showError(
            error instanceof Error
              ? error.message
              : "Unable to update profile",
          );
        }
      })}
      footerMessage={validationMessage}
      footer={
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className={defaultWinForm.buttonPrimary}
        >
          {isSubmitting ? "Saving…" : "Save profile"}
        </button>
      }
    >
      <div className={`${defaultWinForm.field} mb-3`}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-semibold tracking-wide text-[var(--color-accent)]"
            aria-hidden="true"
          >
            {avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-semibold text-[var(--color-ink)]">
              {watchedDisplayName.trim() ||
                user?.displayName ||
                "Your profile"}
            </p>
            <p className="truncate text-[0.875rem] text-[var(--color-muted)]">
              @{user?.username}
              {user?.role ? (
                <span className="capitalize"> · {user.role}</span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-x-3 sm:grid-cols-2">
        <FormInput
          label="Display name"
          autoComplete="one-time-code"
          error={errors.displayName?.message}
          hideErrorText
          {...register("displayName")}
        />
        <FormInput
          label="Username"
          value={user?.username ?? ""}
          readOnly
          tabIndex={-1}
        />
        <FormInput
          label="Email"
          type="text"
          inputMode="email"
          autoComplete="one-time-code"
          error={errors.email?.message}
          hideErrorText
          {...register("email")}
        />
        <FormInput
          label="Phone"
          type="text"
          inputMode="tel"
          autoComplete="one-time-code"
          error={errors.phone?.message}
          hideErrorText
          {...register("phone")}
        />
      </div>
    </FormPanel>
  );
}
