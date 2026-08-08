import type { InputHTMLAttributes } from "react";
import { forwardRef, useState } from "react";

import { defaultWinForm } from "@/components/forms/formClasses";

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hideErrorText?: boolean;
};

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  function FormInput(
    {
      label,
      error,
      hideErrorText = false,
      id,
      className = "",
      autoComplete = "new-password",
      type = "text",
      readOnly = false,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) {
    const inputId = id ?? props.name;
    const [hasUserFocus, setHasUserFocus] = useState(false);
    // Date pickers must stay editable so the native calendar can open.
    const blockAutofillUntilFocus = type !== "date" && type !== "time";

    const control = (
      <input
        {...props}
        ref={ref}
        id={inputId}
        type={type}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        readOnly={readOnly || (blockAutofillUntilFocus && !hasUserFocus)}
        onFocus={(event) => {
          setHasUserFocus(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setHasUserFocus(false);
          onBlur?.(event);
        }}
        aria-autocomplete="none"
        data-1p-ignore
        data-bwignore="true"
        data-lpignore="true"
        data-protonpass-ignore="true"
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
