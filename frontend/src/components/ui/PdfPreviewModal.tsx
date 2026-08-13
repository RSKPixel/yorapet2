import { DocumentArrowDownIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type PdfPreviewModalProps = {
  open: boolean;
  title?: string;
  fileName?: string | null;
  pdfUrl?: string | null;
  loading?: boolean;
  onClose: () => void;
  onDownload: () => void;
};

export function PdfPreviewModal({
  open,
  title = "PDF preview",
  fileName,
  pdfUrl,
  loading = false,
  onClose,
  onDownload,
}: PdfPreviewModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="app-modal-overlay app-modal-overlay--pdf"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="app-modal app-modal--pdf"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-preview-title"
      >
        <div className="app-modal-header">
          <h1 id="pdf-preview-title" className="app-modal-title">
            <DocumentTextIcon
              className="app-modal-title-icon"
              aria-hidden="true"
            />
            <span className="app-modal-title-text">{title}</span>
          </h1>
          <button
            type="button"
            className="app-modal-close"
            onClick={onClose}
            aria-label="Close PDF preview"
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

        <div className="app-modal-pdf-body">
          {loading || !pdfUrl ? (
            <div className="app-modal-pdf-loading">
              <span className="app-modal-pdf-spinner" aria-hidden="true" />
              <span>Generating PDF preview…</span>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              title={title}
              className="app-modal-pdf-frame"
            />
          )}
        </div>

        <div className="app-modal-pdf-footer">
          {fileName ? (
            <p className="app-modal-pdf-filename" title={fileName}>
              {fileName}
            </p>
          ) : (
            <span />
          )}
          <div className="app-modal-pdf-actions">
            <button
              type="button"
              className="default-win-form__button"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="default-win-form__button default-win-form__button--primary"
              onClick={onDownload}
              disabled={loading || !pdfUrl}
            >
              <DocumentArrowDownIcon
                className="default-win-form__button-icon"
                aria-hidden="true"
              />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
