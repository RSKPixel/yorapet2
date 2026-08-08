import type {
  ComponentType,
  FormEvent,
  FormHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  SVGProps,
} from "react";

import { FormMessageInline } from "@/components/forms/FormMessage";
import { defaultWinForm } from "@/components/forms/formClasses";

type FormPanelProps = {
  title?: string;
  titleIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  subtitle?: string;
  hideHeader?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  footerMessage?: string;
  className?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLFormElement>) => void;
  wide?: boolean;
  fill?: boolean;
  flat?: boolean;
};

export function FormPanel({
  title,
  titleIcon: TitleIcon,
  subtitle,
  hideHeader = false,
  children,
  footer,
  footerMessage,
  className = "",
  onSubmit,
  onKeyDown,
  wide = false,
  fill = false,
  flat = false,
}: FormPanelProps) {
  const formClass = [
    defaultWinForm.root,
    wide ? `${defaultWinForm.root}--wide` : "",
    fill ? `${defaultWinForm.root}--fill` : "",
    flat ? `${defaultWinForm.root}--flat` : "",
    hideHeader ? `${defaultWinForm.root}--headerless` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const hostClass = [
    defaultWinForm.host,
    fill ? `${defaultWinForm.host}--fill` : "",
    flat ? `${defaultWinForm.host}--flat` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      {!flat && !hideHeader && title ? (
        <div className={defaultWinForm.header}>
          <span className={defaultWinForm.title}>
            {TitleIcon ? (
              <TitleIcon
                className={defaultWinForm.titleIcon}
                aria-hidden="true"
              />
            ) : null}
            {title}
          </span>
          {subtitle ? (
            <span className={defaultWinForm.subtitle}>{subtitle}</span>
          ) : null}
        </div>
      ) : null}
      <div className={defaultWinForm.body}>{children}</div>
      {footer ? (
        <div className={defaultWinForm.footer}>
          <div className="default-win-form__footer-bar">
            <div className="default-win-form__footer-left">
              {footerMessage ? (
                <div
                  className="default-win-form__footer-message default-win-form__footer-message--error"
                  role="alert"
                  aria-live="polite"
                >
                  <p
                    className="default-win-form__footer-message-text"
                    title={footerMessage}
                  >
                    {footerMessage}
                  </p>
                </div>
              ) : (
                <FormMessageInline variant="form" />
              )}
            </div>
            <div className="default-win-form__footer-right">{footer}</div>
          </div>
        </div>
      ) : null}
    </>
  );

  if (onSubmit) {
    const formProps: FormHTMLAttributes<HTMLFormElement> = {
      onSubmit,
      onKeyDown,
      autoComplete: "off",
      noValidate: true,
      className: formClass,
    };
    return (
      <div className={hostClass}>
        <form {...formProps}>{body}</form>
      </div>
    );
  }

  return (
    <div className={hostClass}>
      <div className={formClass}>{body}</div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <label
      className={[defaultWinForm.field, className].filter(Boolean).join(" ")}
    >
      <span className={defaultWinForm.label}>{label}</span>
      {children}
    </label>
  );
}
