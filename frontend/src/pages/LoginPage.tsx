import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { BrandName } from "@/components/brand";
import { FormInput, FormPanel, defaultWinForm } from "@/components/forms";
import {
  LoginIcon,
  UserCircleIcon,
} from "@/components/forms/formIcons";
import { useAuth } from "@/hooks/useAuth";
import { useFormMessage } from "@/hooks/useFormMessage";

const loginSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;
type LoginLocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { showError } = useFormMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-muted)]">Loading session…</p>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const state = location.state as LoginLocationState | null;
  const destination = state?.from?.pathname
    ? `${state.from.pathname}${state.from.search ?? ""}${state.from.hash ?? ""}`
    : "/";
  const validationMessage =
    errors.username?.message ?? errors.password?.message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4 py-10">
      <div className="absolute top-5 left-5">
        <BrandName hero />
      </div>

      <section className="w-full max-w-md">
        <FormPanel
          title="User Login"
          titleIcon={UserCircleIcon}
          className="login-relic-panel"
          onSubmit={handleSubmit(async (values) => {
            try {
              await login(values.username, values.password);
              navigate(destination, { replace: true });
            } catch (error) {
              showError(
                error instanceof Error ? error.message : "Unable to sign in",
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
              <LoginIcon
                className="default-win-form__button-icon"
                aria-hidden="true"
              />
              {isSubmitting ? "Logging in…" : "Login"}
            </button>
          }
        >
          <FormInput
            label="Username"
            autoComplete="one-time-code"
            error={errors.username?.message}
            hideErrorText
            {...register("username")}
          />
          <FormInput
            label="Password"
            type="password"
            autoComplete="one-time-code"
            error={errors.password?.message}
            hideErrorText
            {...register("password")}
          />
        </FormPanel>
      </section>
    </main>
  );
}
