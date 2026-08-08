import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

import { defaultWinForm } from "@/components/forms/formClasses";

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hideErrorText?: boolean;
};

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  function FormTextarea(
    {
      label,
      error,
      hideErrorText = false,
      id,
      className = "",
      autoComplete = "new-password",
      ...props
    },
    ref,
  ) {
    const inputId = id ?? props.name;

    const control = (
      <textarea
        {...props}
        ref={ref}
        id={inputId}
        autoComplete={autoComplete}
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        className={[defaultWinForm.control, className].filter(Boolean).join(" ")}
      />
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
