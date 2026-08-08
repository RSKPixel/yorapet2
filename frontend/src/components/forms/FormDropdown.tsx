import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { defaultWinForm } from "@/components/forms/formClasses";

export type FormDropdownOption = {
  value: string;
  label: string;
  /** Extra text used for filtering (defaults to label). */
  searchText?: string;
  secondary?: string;
  tertiary?: string;
};

type FormDropdownProps = {
  options?: FormDropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  listClassName?: string;
  style?: CSSProperties;
};

export function FormDropdown({
  options = [],
  value = "",
  onChange,
  disabled = false,
  placeholder = "Select…",
  emptyMessage = "No options",
  className = "",
  listClassName = "",
  style,
}: FormDropdownProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selected =
    options.find((option) => String(option.value) === String(value)) ?? null;
  const label = selected?.label ?? placeholder;

  function updateMenuPosition() {
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    const rect = button.getBoundingClientRect();
    const maxHeight = 220;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < Math.min(maxHeight, 140) && spaceAbove > spaceBelow;
    const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      minWidth: Math.max(rect.width, 10),
      width: "max-content",
      maxWidth: Math.min(window.innerWidth - 16, Math.max(rect.width, 320)),
      top: openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
      maxHeight: Math.max(height, 80),
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }
    updateMenuPosition();
    function onReposition() {
      updateMenuPosition();
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function onDocPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const inTrigger = rootRef.current?.contains(target);
      const inMenu = listRef.current?.contains(target);
      if (!inTrigger && !inMenu) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const index = Math.max(
      0,
      options.findIndex((option) => String(option.value) === String(value)),
    );
    setHighlight(index === -1 ? 0 : index);
  }, [open, options, value]);

  useEffect(() => {
    if (!open || !listRef.current) {
      return;
    }
    const item = listRef.current.querySelector(
      'li:has([data-active="true"])',
    ) as HTMLElement | null;
    if (!item) {
      return;
    }
    const activeTop = item.offsetTop;
    const activeBottom = activeTop + item.offsetHeight;
    const viewTop = listRef.current.scrollTop;
    const viewBottom = viewTop + listRef.current.clientHeight;
    if (activeTop < viewTop) {
      listRef.current.scrollTop = activeTop;
    } else if (activeBottom > viewBottom) {
      listRef.current.scrollTop = activeBottom - listRef.current.clientHeight;
    }
  }, [highlight, open]);

  function selectOption(option: FormDropdownOption) {
    onChange?.(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!options.length) {
        return;
      }
      setHighlight((index) => Math.min(index + 1, options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!options.length) {
        return;
      }
      setHighlight((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (!open) {
        setOpen(true);
        return;
      }
      if (options[highlight]) {
        selectOption(options[highlight]);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const menu =
    open && menuStyle
      ? createPortal(
          <ul
            id={listId}
            ref={listRef}
            className={[
              "default-win-form__dropdown-list",
              listClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            role="listbox"
            style={menuStyle}
          >
            {options.length === 0 ? (
              <li className="default-win-form__dropdown-empty">{emptyMessage}</li>
            ) : (
              options.map((option, index) => {
                const active = index === highlight;
                const selectedOption = String(option.value) === String(value);
                return (
                  <li key={String(option.value)} role="option" aria-selected={selectedOption}>
                    <button
                      type="button"
                      data-active={active ? "true" : undefined}
                      className={[
                        "default-win-form__dropdown-option",
                        active ? "is-active" : "",
                        selectedOption ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseEnter={() => setHighlight(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectOption(option)}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      className={["default-win-form__dropdown", className].filter(Boolean).join(" ")}
      ref={rootRef}
      style={style}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`${defaultWinForm.control} default-win-form__dropdown-trigger`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        title={typeof label === "string" ? label : undefined}
        onClick={() => {
          if (disabled) {
            return;
          }
          setOpen((previous) => !previous);
        }}
        onKeyDown={onKeyDown}
      >
        <span className="default-win-form__dropdown-label">{label}</span>
        <ChevronDownIcon
          className={[
            "default-win-form__dropdown-chevron",
            open ? "is-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
      </button>
      {menu}
    </div>
  );
}
