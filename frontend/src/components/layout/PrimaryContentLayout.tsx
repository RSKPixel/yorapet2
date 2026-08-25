import type { FormEvent, KeyboardEvent, ReactNode } from "react";

import { FormMessageInline } from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import type { BreadcrumbItem } from "@/components/ui/PageBreadcrumb";

type PrimaryContentLayoutProps = {
  breadcrumb: BreadcrumbItem[];
  children: ReactNode;
  footer?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLFormElement>) => void;
  className?: string;
};

/**
 * Full-height content page: breadcrumb + scrollable body + content footer
 * (messages left, actions right). Yoradm PrimaryContentLayout pattern without FormPanel.
 */
export function PrimaryContentLayout({
  breadcrumb,
  children,
  footer,
  onSubmit,
  onKeyDown,
  className = "",
}: PrimaryContentLayoutProps) {
  return (
    <div className={["primary-content", className].filter(Boolean).join(" ")}>
      <div className="primary-content__heading">
        <PageHeader items={breadcrumb} />
      </div>
      <form
        className="primary-content__form"
        autoComplete="off"
        noValidate
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
      >
        <div className="primary-content__body">{children}</div>
        {footer ? (
          <footer className="content-footer">
            <div className="content-footer__bar">
              <div className="min-w-0 flex-1">
                <FormMessageInline />
              </div>
              <div className="content-footer__actions shrink-0">{footer}</div>
            </div>
          </footer>
        ) : null}
      </form>
    </div>
  );
}
