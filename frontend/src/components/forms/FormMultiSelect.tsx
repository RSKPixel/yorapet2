import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { defaultWinForm } from "@/components/forms/formClasses";
import type { FormDropdownOption } from "@/components/forms/FormDropdown";

type FormMultiSelectProps = {
  options?: FormDropdownOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  listClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

function selectionLabel(
  selected: FormDropdownOption[],
  placeholder: string,
): string {
  if (selected.length === 0) {
    return placeholder;
  }
  if (selected.length === 1) {
    return selected[0].label;
  }
  return `${selected.length} selected`;
}

export function FormMultiSelect({
  options = [],
  value = [],
  onChange,
  disabled = false,
  placeholder = "Select…",
  emptyMessage = "No options",
  className = "",
  listClassName = "",
  searchable = true,
  searchPlaceholder = "Search…",
}: FormMultiSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const keyboardScrollRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedSet = useMemo(() => new Set(value.map(String)), [value]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(String(option.value))),
    [options, selectedSet],
  );

  const label = selectionLabel(selectedOptions, placeholder);

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
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    const rect = button.getBoundingClientRect();
    const maxHeight = 280;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp =
      spaceBelow < Math.min(maxHeight, 160) && spaceAbove > spaceBelow;
    const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);

    const width = Math.min(
      window.innerWidth - 16,
      Math.max(rect.width, 28 * 16),
    );

    setMenuStyle({
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - width - 8),
      width,
      top: openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
      maxHeight: Math.max(height, 120),
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
      const inTrigger = rootRef.current?.contains(target);
      const inMenu = listRef.current?.contains(target);
      if (!inTrigger && !inMenu) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setHighlight(0);
    if (searchable) {
      searchRef.current?.focus();
    }
  }, [open, searchable]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function scrollActiveOptionIntoView() {
    if (!optionsRef.current) {
      return;
    }
    const item = optionsRef.current.querySelector(
      'li:has([data-active="true"])',
    ) as HTMLElement | null;
    item?.scrollIntoView({ block: "nearest" });
  }

  useEffect(() => {
    if (!open || !keyboardScrollRef.current) {
      return;
    }
    keyboardScrollRef.current = false;
    scrollActiveOptionIntoView();
  }, [highlight, open]);

  function toggleOption(option: FormDropdownOption) {
    const key = String(option.value);
    if (selectedSet.has(key)) {
      onChange?.(value.filter((item) => String(item) !== key));
      return;
    }
    onChange?.([...value, key]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement | HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!filtered.length) {
        return;
      }
      setHighlight((index) =>
        Math.min(index + 1, Math.max(filtered.length - 1, 0)),
      );
      keyboardScrollRef.current = true;
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open || !filtered.length) {
        return;
      }
      setHighlight((index) => Math.max(index - 1, 0));
      keyboardScrollRef.current = true;
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (event.currentTarget === searchRef.current) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered[highlight]) {
        toggleOption(filtered[highlight]);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setQuery("");
      buttonRef.current?.focus();
    }
  }

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={listRef}
            className={[
              "default-win-form__multi-select-menu",
              listClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            style={menuStyle}
          >
            {searchable ? (
              <div className="default-win-form__multi-select-search">
                <input
                  ref={searchRef}
                  type="text"
                  className={defaultWinForm.control}
                  placeholder={searchPlaceholder}
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onKeyDown}
                />
              </div>
            ) : null}
            <ul
              id={listId}
              ref={optionsRef}
              className="default-win-form__autocomplete-list"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <li className="default-win-form__dropdown-empty">{emptyMessage}</li>
              ) : (
                filtered.map((option, index) => {
                  const active = index === highlight;
                  const checked = selectedSet.has(String(option.value));
                  return (
                    <li key={String(option.value)} role="option" aria-selected={checked}>
                      <button
                        type="button"
                        data-active={active ? "true" : undefined}
                        className={[
                          "default-win-form__dropdown-option",
                          "default-win-form__multi-select-option",
                          active ? "is-active" : "",
                          checked ? "is-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onMouseEnter={() => setHighlight(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => toggleOption(option)}
                      >
                        <span
                          className="default-win-form__multi-select-check"
                          aria-hidden="true"
                        />
                        <span className="default-win-form__dropdown-label">
                          {option.label}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={[
        "default-win-form__multi-select",
        selectedOptions.length === 0 ? "is-empty" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      ref={rootRef}
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
        title={label}
        onClick={() => {
          if (disabled) {
            return;
          }
          setOpen((previous) => {
            if (previous) {
              setQuery("");
            }
            return !previous;
          });
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
