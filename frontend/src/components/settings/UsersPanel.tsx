import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormInput, FormPanel, FormSelect, defaultWinForm } from "@/components/forms";
import { PlusUserIcon } from "@/components/forms/formIcons";
import { useAuth } from "@/hooks/useAuth";
import { useFormMessage } from "@/hooks/useFormMessage";
import { userService, type ManagedUser } from "@/services/userService";

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(100, "Username is too long"),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(120, "Display name is too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "user"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

const lastLoginFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatLastLogin(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return lastLoginFormatter.format(date);
}

export function UsersPanel() {
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useFormMessage();
  const queryClient = useQueryClient();
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.listUsers(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      displayName: "",
      password: "",
      role: "user",
    },
  });

  const validationMessage =
    errors.username?.message ??
    errors.displayName?.message ??
    errors.password?.message ??
    errors.role?.message;

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: async (created) => {
      queryClient.setQueryData<ManagedUser[]>(["users"], (current) => {
        const next = [
          ...(current ?? []).filter((user) => user.id !== created.id),
          created,
        ];
        next.sort((a, b) => a.username.localeCompare(b.username));
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      reset({
        username: "",
        displayName: "",
        password: "",
        role: "user",
      });
      showSuccess("User created successfully.");
    },
    onError: (error: Error) => {
      showError(error.message || "Unable to create user");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      role,
      isActive,
    }: {
      userId: number;
      role: "admin" | "user";
      isActive: boolean;
    }) =>
      userService.updateUser(userId, {
        role,
        is_active: isActive,
      }),
    onMutate: ({ userId }) => {
      setUpdatingUserId(userId);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData<ManagedUser[]>(["users"], (current) => {
        if (!current) {
          return [updated];
        }
        return current.map((user) => (user.id === updated.id ? updated : user));
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("User updated successfully.");
    },
    onError: (error: Error) => {
      showError(error.message || "Unable to update user");
    },
    onSettled: () => {
      setUpdatingUserId(null);
    },
  });

  function updateUserField(
    user: ManagedUser,
    patch: { role?: "admin" | "user"; isActive?: boolean },
  ) {
    const role = patch.role ?? (user.role === "admin" ? "admin" : "user");
    const isActive = patch.isActive ?? user.isActive;
    if (role === user.role && isActive === user.isActive) {
      return;
    }
    updateMutation.mutate({
      userId: user.id,
      role,
      isActive,
    });
  }

  return (
    <div className="settings-users">
      <div className="settings-users__form">
        <FormPanel
          title="New user"
          titleIcon={PlusUserIcon}
          hideHeader
          wide
          onSubmit={handleSubmit((values) => {
            createMutation.mutate({
              username: values.username,
              display_name: values.displayName,
              password: values.password,
              role: values.role,
              is_active: true,
            });
          })}
          footerMessage={validationMessage}
          footer={
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className={defaultWinForm.buttonPrimary}
            >
              {createMutation.isPending ? "Creating…" : "Create user"}
            </button>
          }
        >
          <div className="grid gap-x-3 sm:grid-cols-2">
            <FormInput
              label="Username"
              autoComplete="one-time-code"
              error={errors.username?.message}
              hideErrorText
              {...register("username")}
            />
            <FormInput
              label="Display name"
              autoComplete="one-time-code"
              error={errors.displayName?.message}
              hideErrorText
              {...register("displayName")}
            />
            <FormInput
              label="Password"
              type="password"
              autoComplete="one-time-code"
              error={errors.password?.message}
              hideErrorText
              {...register("password")}
            />
            <FormSelect
              label="Role"
              options={[
                { label: "User", value: "user" },
                { label: "Admin", value: "admin" },
              ]}
              error={errors.role?.message}
              hideErrorText
              {...register("role")}
            />
          </div>
        </FormPanel>
      </div>

      <div className="app-table-shell settings-users__table">
        <div className="app-table-scroll">
          {usersQuery.isLoading ? (
            <p className="app-table-empty">Loading users…</p>
          ) : usersQuery.isError ? (
            <p className="app-table-empty text-[var(--color-danger)]" role="alert">
              {(usersQuery.error as Error).message}
            </p>
          ) : (
            <table className="app-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Display name</th>
                  <th>Last login</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(usersQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="app-table-empty">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  (usersQuery.data ?? []).map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const isUpdating = updatingUserId === user.id;
                    const roleValue = user.role === "admin" ? "admin" : "user";

                    return (
                      <tr key={user.id}>
                        <td>
                          {user.username}
                          {isSelf ? (
                            <span className="ml-1.5 text-xs text-[var(--color-muted)]">
                              (you)
                            </span>
                          ) : null}
                        </td>
                        <td>{user.displayName}</td>
                        <td>{formatLastLogin(user.lastLoginAt)}</td>
                        <td>
                          <select
                            aria-label={`Role for ${user.username}`}
                            className="app-table-select"
                            value={roleValue}
                            disabled={isUpdating}
                            onChange={(event) =>
                              updateUserField(user, {
                                role: event.target.value as "admin" | "user",
                              })
                            }
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <select
                            aria-label={`Status for ${user.username}`}
                            className="app-table-select"
                            value={user.isActive ? "active" : "inactive"}
                            disabled={isUpdating || isSelf}
                            title={
                              isSelf
                                ? "You cannot deactivate your own account"
                                : undefined
                            }
                            onChange={(event) =>
                              updateUserField(user, {
                                isActive: event.target.value === "active",
                              })
                            }
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="app-table-foot">
          <span className="app-table-foot-label">
            {usersQuery.isLoading
              ? "Loading…"
              : usersQuery.isError
                ? "—"
                : `${(usersQuery.data ?? []).length} user${
                    (usersQuery.data ?? []).length === 1 ? "" : "s"
                  }`}
          </span>
        </div>
      </div>
    </div>
  );
}
