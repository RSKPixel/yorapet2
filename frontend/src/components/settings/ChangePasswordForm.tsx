import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormInput, FormPanel, defaultWinForm } from "@/components/forms";
import { KeyIcon } from "@/components/forms/formIcons";
import { useFormMessage } from "@/hooks/useFormMessage";
import { authService } from "@/services/authService";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const { showError, showSuccess } = useFormMessage();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const validationMessage =
    errors.currentPassword?.message ??
    errors.newPassword?.message ??
    errors.confirmPassword?.message;

  return (
    <FormPanel
      title="Password"
      titleIcon={KeyIcon}
      hideHeader
      wide
      onSubmit={handleSubmit(async (values) => {
        try {
          await authService.changePassword(
            values.currentPassword,
            values.newPassword,
          );
          reset();
          showSuccess("Password updated successfully.");
        } catch (error) {
          showError(
            error instanceof Error
              ? error.message
              : "Unable to change password",
          );
        }
      })}
      footerMessage={validationMessage}
      footer={
        <button
          type="submit"
          disabled={isSubmitting}
          className={defaultWinForm.buttonPrimary}
        >
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
      }
    >
      <FormInput
        label="Current password"
        type="password"
        autoComplete="one-time-code"
        error={errors.currentPassword?.message}
        hideErrorText
        {...register("currentPassword")}
      />
      <FormInput
        label="New password"
        type="password"
        autoComplete="one-time-code"
        error={errors.newPassword?.message}
        hideErrorText
        {...register("newPassword")}
      />
      <FormInput
        label="Confirm new password"
        type="password"
        autoComplete="one-time-code"
        error={errors.confirmPassword?.message}
        hideErrorText
        {...register("confirmPassword")}
      />
    </FormPanel>
  );
}
