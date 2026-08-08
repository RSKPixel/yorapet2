import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";

import { defaultWinForm } from "@/components/forms/formClasses";

type FormSelectOption = {
  label: string;
  value: string;
};

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options?: FormSelectOption[];
  error?: string;
  hideErrorText?: boolean;
};

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  function FormSelect(
    {
      label,
      options,
      error,
      hideErrorText = false,
      id,
      className = "",
      autoComplete = "new-password",
      children,
      ...props
    },
    ref,
  ) {
    const inputId = id ?? props.name;

    const control = (
      <select
        {...props}
        ref={ref}
        id={inputId}
        autoComplete={autoComplete}
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        className={[defaultWinForm.control, className].filter(Boolean).join(" ")}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    );

    if (!label) {
      return (
        <>
          {control}
          {error && !hideErrorText ? (
            <span className={defaultWinForm.error} role="alert">
              {error}
            </span>
          ) : null}
        </>
      );
    }

    return (
      <label className={defaultWinForm.field} htmlFor={inputId}>
        <span className={defaultWinForm.label}>{label}</span>
        {control}
        {error && !hideErrorText ? (
          <span className={defaultWinForm.error} role="alert">
            {error}
          </span>
        ) : null}
      </label>
    );
  },
);
