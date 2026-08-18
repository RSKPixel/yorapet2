import { useEffect, type ComponentType, type ReactNode, type SVGProps } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  title: string;
  titleIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  ariaLabelledBy?: string;
};

export function Modal({
  title,
  titleIcon: TitleIcon,
  onClose,
  children,
  className = "",
  ariaLabelledBy = "app-modal-title",
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="app-modal-overlay" onClick={onClose}>
      <div
        className={["app-modal", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="app-modal-header">
          <h1 id={ariaLabelledBy} className="app-modal-title">
            {TitleIcon ? (
              <TitleIcon className="app-modal-title-icon" aria-hidden="true" />
            ) : null}
            {title}
          </h1>
          <button
            type="button"
            className="app-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
