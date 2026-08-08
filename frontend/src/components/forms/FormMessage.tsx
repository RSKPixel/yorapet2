import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const TOAST_DEFAULT_DURATION_MS = 3000;
export const TOAST_MAX_VISIBLE = 3;
const TOAST_EXIT_MS = 350;

export type FormMessageType = "error" | "success" | "info";

type FormToast = {
  id: string;
  message: string;
  type: FormMessageType;
  exiting: boolean;
};

type EnqueueOptions = {
  type?: FormMessageType;
  duration?: number;
  skipCap?: boolean;
};

type FormMessageContextValue = {
  toasts: FormToast[];
  inlineHostActive: boolean;
  registerInlineHost: () => () => void;
  showToast: (message: string, options?: EnqueueOptions) => string;
  showErrors: (messages: string | string[], duration?: number) => string[];
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  showMessage: (
    text: string,
    type?: FormMessageType,
    duration?: number,
  ) => string;
  showSuccess: (text: string, duration?: number) => string;
  showError: (text: string, duration?: number) => string;
  showInfo: (text: string, duration?: number) => string;
};

const FormMessageContext = createContext<FormMessageContextValue | undefined>(
  undefined,
);

type FormMessageProviderProps = {
  children: ReactNode;
};

export function FormMessageProvider({ children }: FormMessageProviderProps) {
  const [toasts, setToasts] = useState<FormToast[]>([]);
  const [inlineHostCount, setInlineHostCount] = useState(0);
  const toastsRef = useRef(toasts);
  const timersRef = useRef(
    new Map<string, { auto?: number; remove?: number }>(),
  );
  const inlineHostCountRef = useRef(0);

  toastsRef.current = toasts;
  inlineHostCountRef.current = inlineHostCount;

  const registerInlineHost = useCallback(() => {
    setInlineHostCount((count) => count + 1);
    return () => setInlineHostCount((count) => Math.max(0, count - 1));
  }, []);

  const clearTimers = useCallback((id: string) => {
    const timers = timersRef.current.get(id);
    if (!timers) {
      return;
    }
    if (timers.auto) {
      window.clearTimeout(timers.auto);
    }
    if (timers.remove) {
      window.clearTimeout(timers.remove);
    }
    timersRef.current.delete(id);
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      clearTimers(id);
      setToasts((current) => current.filter((entry) => entry.id !== id));
    },
    [clearTimers],
  );

  const clearToasts = useCallback(() => {
    for (const id of timersRef.current.keys()) {
      clearTimers(id);
    }
    setToasts([]);
  }, [clearTimers]);

  const dismissToast = useCallback(
    (id: string) => {
      const toast = toastsRef.current.find((entry) => entry.id === id);
      if (!toast || toast.exiting) {
        return;
      }

      clearTimers(id);

      if (inlineHostCountRef.current > 0) {
        removeToast(id);
        return;
      }

      setToasts((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, exiting: true } : entry,
        ),
      );

      timersRef.current.set(id, {
        remove: window.setTimeout(() => {
          removeToast(id);
        }, TOAST_EXIT_MS),
      });
    },
    [clearTimers, removeToast],
  );

  const enqueueToast = useCallback(
    (message: string, options: EnqueueOptions = {}) => {
      const id = crypto.randomUUID();
      const type = options.type ?? "error";
      const duration = options.duration ?? TOAST_DEFAULT_DURATION_MS;
      const skipCap = Boolean(options.skipCap);

      if (!skipCap) {
        const current = toastsRef.current;
        if (current.length >= TOAST_MAX_VISIBLE) {
          const oldest =
            current.find((entry) => !entry.exiting) ?? current[0];
          if (oldest) {
            dismissToast(oldest.id);
          }
        }
      }

      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

      if (duration > 0) {
        const auto = window.setTimeout(() => {
          dismissToast(id);
        }, duration);
        timersRef.current.set(id, { auto });
      }

      return id;
    },
    [dismissToast],
  );

  const showToast = useCallback(
    (message: string, options: EnqueueOptions = {}) =>
      enqueueToast(message, options),
    [enqueueToast],
  );

  const showErrors = useCallback(
    (messages: string | string[], duration = TOAST_DEFAULT_DURATION_MS) => {
      const list = [
        ...new Set(
          (Array.isArray(messages) ? messages : [messages])
            .map((msg) => (typeof msg === "string" ? msg.trim() : ""))
            .filter(Boolean),
        ),
      ];
      if (!list.length) {
        return [];
      }

      return list.map((message) =>
        enqueueToast(message, { type: "error", duration, skipCap: true }),
      );
    },
    [enqueueToast],
  );

  const showMessage = useCallback(
    (text: string, type: FormMessageType = "info", duration?: number) =>
      showToast(text, { type, duration }),
    [showToast],
  );

  const value = useMemo<FormMessageContextValue>(
    () => ({
      toasts,
      inlineHostActive: inlineHostCount > 0,
      registerInlineHost,
      showToast,
      showErrors,
      dismissToast,
      clearToasts,
      showMessage,
      showSuccess: (text, duration) =>
        showToast(text, { type: "success", duration }),
      showError: (text, duration) =>
        showToast(text, { type: "error", duration }),
      showInfo: (text, duration) => showToast(text, { type: "info", duration }),
    }),
    [
      toasts,
      inlineHostCount,
      registerInlineHost,
      showToast,
      showErrors,
      dismissToast,
      clearToasts,
      showMessage,
    ],
  );

  const showFloatingToasts = inlineHostCount === 0 && toasts.length > 0;

  return (
    <FormMessageContext.Provider value={value}>
      {children}
      {showFloatingToasts ? (
        <div
          className="form-toast-container"
          aria-live="polite"
          aria-relevant="additions"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={[
                "form-toast",
                `form-toast--${toast.type}`,
                toast.exiting ? "form-toast--exiting" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="alert"
            >
              <p className="form-toast__message">{toast.message}</p>
              <button
                type="button"
                className="form-toast__close"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </FormMessageContext.Provider>
  );
}

type FormMessageInlineProps = {
  className?: string;
  variant?: "content" | "form";
};

/** Compact inline status line for content or form footers. */
export function FormMessageInline({
  className = "",
  variant = "content",
}: FormMessageInlineProps) {
  const { toasts, dismissToast, registerInlineHost } = useFormMessage();
  const baseClass =
    variant === "form" ? "default-win-form__footer-message" : "content-footer__message";
  const textClass =
    variant === "form"
      ? "default-win-form__footer-message-text"
      : "content-footer__message-text";
  const dismissClass =
    variant === "form"
      ? "default-win-form__footer-message-dismiss"
      : "content-footer__message-dismiss";

  useEffect(() => registerInlineHost(), [registerInlineHost]);

  const active = toasts.filter((toast) => !toast.exiting);
  const latest = active.length ? active[active.length - 1] : null;

  if (!latest) {
    return (
      <div
        className={[baseClass, className]
          .filter(Boolean)
          .join(" ")}
        aria-live="polite"
      />
    );
  }

  return (
    <div
      className={[
        baseClass,
        `${baseClass}--${latest.type}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="alert"
      aria-live="polite"
    >
      <p className={textClass} title={latest.message}>
        {latest.message}
      </p>
      <button
        type="button"
        className={dismissClass}
        onClick={() => dismissToast(latest.id)}
        aria-label="Dismiss message"
      >
        ×
      </button>
    </div>
  );
}

export function useFormMessage(): FormMessageContextValue {
  const context = useContext(FormMessageContext);
  if (!context) {
    throw new Error("useFormMessage must be used within FormMessageProvider");
  }
  return context;
}
