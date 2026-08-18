import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { defaultWinForm } from "@/components/forms/formClasses";
import type { FormDropdownOption } from "@/components/forms/FormDropdown";

export type FormAutocompleteHandle = {
  focus: () => boolean;
};

type FormAutocompleteProps = {
  options?: FormDropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
  listClassName?: string;
  placeholder?: string;
  openOnFocus?: boolean;
  renderOption?: (option: FormDropdownOption) => ReactNode;
};

export const FormAutocomplete = forwardRef<
  FormAutocompleteHandle,
  FormAutocompleteProps
>(function FormAutocomplete(
  {
    options = [],
    value = "",
    onChange,
    disabled = false,
    emptyMessage = "No matches",
    className = "",
    listClassName = "",
    placeholder = "",
    openOnFocus = true,
    renderOption,
  },
  ref,
) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  useImperativeHandle(ref, () => ({
    focus() {
      const input = inputRef.current;
      if (!input || input.disabled) {
        return false;
      }
      input.focus();
      setEditing(true);
      setQuery("");
      setOpen(true);
      return true;
    },
  }));

  const selected =
    options.find((option) => String(option.value) === String(value)) ?? null;

  const displayValue = editing || open ? query : selected ? selected.label : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return options;
    }
    return options.filter((option) => {
      const haystack = (option.searchText ?? option.label).toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  function updateMenuPosition() {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const rect = input.getBoundingClientRect();
    const maxHeight = 220;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < Math.min(maxHeight, 140) && spaceAbove > spaceBelow;
    const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);
    const width = Math.min(window.innerWidth - 16, Math.max(rect.width, 28 * 16));

    setMenuStyle({
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - width - 8),
      width,
      top: openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
      maxHeight: Math.max(height, 80),
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
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
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function onDocPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setEditing(false);
      setQuery("");
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

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
  }, [highlight, open, filtered]);

  function confirmOption(option: FormDropdownOption) {
    onChange?.(option.value);
    setOpen(false);
    setEditing(false);
    setQuery("");
  }

  function onFocus() {
    if (disabled) {
      return;
    }
    setEditing(true);
    if (openOnFocus) {
      setQuery("");
      setOpen(true);
      return;
    }
    setQuery(selected?.label ?? "");
    setOpen(false);
  }

  function onBlur(event: FocusEvent<HTMLInputElement>) {
    const next = event.relatedTarget as Node | null;
    if (rootRef.current?.contains(next) || listRef.current?.contains(next)) {
      return;
    }
    setOpen(false);
    setEditing(false);
    setQuery("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setEditing(true);
        setOpen(true);
        return;
      }
      if (!filtered.length) {
        return;
      }
      setHighlight((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open || !filtered.length) {
        return;
      }
      setHighlight((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (open && filtered[highlight]) {
        confirmOption(filtered[highlight]);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setEditing(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  const menu =
    open && menuStyle
      ? createPortal(
          <ul
            id={listId}
            ref={listRef}
            className={["default-win-form__autocomplete-list", listClassName]
              .filter(Boolean)
              .join(" ")}
            role="listbox"
            style={menuStyle}
          >
            {filtered.length === 0 ? (
              <li className="default-win-form__dropdown-empty">{emptyMessage}</li>
            ) : (
              filtered.map((option, index) => {
                const active = index === highlight;
                const selectedOption = String(option.value) === String(value);
                return (
                  <li
                    key={`${option.value}-${option.label}`}
                    role="option"
                    aria-selected={selectedOption}
                  >
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
                      onClick={() => confirmOption(option)}
                    >
                      {renderOption ? renderOption(option) : option.label}
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
      className={["default-win-form__autocomplete", className]
        .filter(Boolean)
        .join(" ")}
      ref={rootRef}
    >
      <input
        ref={inputRef}
        type="text"
        className={defaultWinForm.control}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        disabled={disabled}
        value={displayValue}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setEditing(true);
          setOpen(true);
          if (value) {
            onChange?.("");
          }
        }}
        onKeyDown={onKeyDown}
      />
      {menu}
    </div>
  );
});
