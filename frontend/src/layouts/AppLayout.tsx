import {
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  CalculatorIcon,
  ChevronDownIcon,
  CircleStackIcon,
  CubeIcon,
  DocumentChartBarIcon,
  HomeIcon,
  InboxStackIcon,
  RectangleStackIcon,
  ShoppingBagIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { BrandName } from "@/components/brand";
import {
  readSidebarPinned,
  writeSidebarPinned,
} from "@/config/sidebarPin";
import { useAuth } from "@/hooks/useAuth";
import { useFormMessage } from "@/hooks/useFormMessage";
import { useSettings } from "@/hooks/useSettings";
import { companyProfileService } from "@/services/companyProfileService";

type NavItem = {
  to: string;
  end?: boolean;
  label: string;
  icon: ReactNode;
};

type NavSection = {
  id: string;
  label: string;
  icon: ReactNode;
  items: NavItem[];
};

const iconClass = "h-4 w-4 shrink-0";

const SettingsIcon = (
  <svg
    className={iconClass}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const LogoutIcon = (
  <svg
    className={iconClass}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

function PinIcon({ solid = false }: { solid?: boolean }) {
  if (solid) {
    return (
      <svg
        className={iconClass}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
      </svg>
    );
  }

  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4h6" />
      <path d="M10 4v5a3 3 0 0 1-3 3h0v2h10v-2h0a3 3 0 0 1-3-3V4" />
      <path d="M12 14v7" />
    </svg>
  );
}

const navSections: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <HomeIcon className={iconClass} aria-hidden="true" />,
    items: [
      {
        to: "/",
        end: true,
        label: "Dashboard",
        icon: <HomeIcon className={iconClass} aria-hidden="true" />,
      },
    ],
  },
  {
    id: "master",
    label: "Master",
    icon: <RectangleStackIcon className={iconClass} aria-hidden="true" />,
    items: [
      {
        to: "/master/inventory",
        label: "Inventory",
        icon: <CubeIcon className={iconClass} aria-hidden="true" />,
      },
    ],
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: <ShoppingBagIcon className={iconClass} aria-hidden="true" />,
    items: [
      {
        to: "/transactions/costing",
        label: "Costing",
        icon: <CalculatorIcon className={iconClass} aria-hidden="true" />,
      },
      {
        to: "/transactions/credit-note",
        label: "Credit Note",
        icon: <ArrowUturnLeftIcon className={iconClass} aria-hidden="true" />,
      },
    ],
  },
  {
    id: "stock-movements",
    label: "Stock Movements",
    icon: <ArchiveBoxIcon className={iconClass} aria-hidden="true" />,
    items: [
      {
        to: "/stock-movements/stock-journal",
        label: "Stock Journal",
        icon: <ArchiveBoxIcon className={iconClass} aria-hidden="true" />,
      },
      {
        to: "/stock-movements/blowing",
        label: "Blowing",
        icon: <ArrowsRightLeftIcon className={iconClass} aria-hidden="true" />,
      },
      {
        to: "/stock-movements/packing-materials",
        label: "Packing Materials",
        icon: <InboxStackIcon className={iconClass} aria-hidden="true" />,
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: <DocumentChartBarIcon className={iconClass} aria-hidden="true" />,
    items: [
      {
        to: "/reports/stock-summary",
        label: "Stock Summary",
        icon: <DocumentChartBarIcon className={iconClass} aria-hidden="true" />,
      },
      {
        to: "/reports/sales",
        label: "Sales",
        icon: <BanknotesIcon className={iconClass} aria-hidden="true" />,
      },
      {
        to: "/reports/purchases",
        label: "Purchases",
        icon: <ShoppingBagIcon className={iconClass} aria-hidden="true" />,
      },
    ],
  },
  {
    id: "data",
    label: "Data",
    icon: <CircleStackIcon className={iconClass} aria-hidden="true" />,
    items: [
      {
        to: "/data/tally-data",
        label: "Tally Data",
        icon: <TableCellsIcon className={iconClass} aria-hidden="true" />,
      },
    ],
  },
];

const navItemBase =
  "flex h-10 w-full cursor-pointer items-center rounded-md text-sm font-medium transition-[colors,padding,gap] duration-200";
const navSectionButtonBase =
  "flex w-full items-center rounded-md transition-[colors,padding,gap] duration-200";

const footerActionClass = [
  navItemBase,
  "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]",
].join(" ");

function navItemLayout(expanded: boolean) {
  return expanded ? "gap-3 px-3" : "gap-3 px-3";
}

function navLabelClass(expanded: boolean) {
  return [
    "whitespace-nowrap transition-opacity duration-200",
    expanded
      ? "opacity-100"
      : "pointer-events-none w-0 overflow-hidden opacity-0",
  ].join(" ");
}

function navSectionButtonClass(active: boolean) {
  return [
    navSectionButtonBase,
    "h-10 gap-3 px-3",
    active
      ? "text-[var(--color-accent)]"
      : "text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)]",
  ].join(" ");
}

function navSubItemClass(isActive: boolean) {
  return [
    "flex h-9 w-full items-center gap-3 rounded-md pl-10 pr-3 text-[0.875rem] font-medium transition-colors",
    isActive
      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]",
  ].join(" ");
}

const lastLoginFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatLastLogin(value: string | null | undefined) {
  if (!value) {
    return "Last login unavailable";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Last login unavailable";
  }
  return `Last login ${lastLoginFormatter.format(date)}`;
}

export function AppLayout() {
  const [pinned, setPinned] = useState(readSidebarPinned);
  const [hovered, setHovered] = useState(false);
  const { user, logout } = useAuth();
  const { clearToasts } = useFormMessage();
  const { openSettings, isOpen: settingsOpen } = useSettings();
  const companyProfileQuery = useQuery({
    queryKey: ["company-profile"],
    queryFn: () => companyProfileService.getProfile(),
    enabled: user !== null,
  });
  const companyName = companyProfileQuery.data?.companyName.trim() ?? "";
  const location = useLocation();
  const activeSection =
    navSections.find((section) =>
      section.items.some((item) =>
        item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
      ),
    )?.id ?? navSections[0]?.id ?? "dashboard";
  const [openSection, setOpenSection] = useState(activeSection);

  const expanded = pinned || hovered;

  useEffect(() => {
    clearToasts();
  }, [location.pathname, clearToasts]);

  useEffect(() => {
    setOpenSection(activeSection);
  }, [activeSection]);

  function togglePin() {
    setPinned((current) => {
      const next = !current;
      writeSidebarPinned(next);
      if (next) {
        setHovered(false);
      }
      return next;
    });
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[var(--color-surface)]">
      <header
        className="z-30 flex shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4"
        style={{ height: "var(--shell-header-height)" }}
      >
        <BrandName />
        {companyName ? (
          <span
            className="min-w-0 truncate text-[0.9375rem] font-semibold text-[var(--color-ink)]"
            title={companyName}
          >
            {companyName}
          </span>
        ) : null}
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <aside
          onMouseEnter={() => {
            if (!pinned) {
              setHovered(true);
            }
          }}
          onMouseLeave={() => {
            if (!pinned) {
              setHovered(false);
            }
          }}
          className={[
            "z-20 flex h-full shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface-raised)] transition-[width] duration-200 ease-out",
            expanded
              ? "w-[var(--shell-sidebar-width)]"
              : "w-[var(--shell-sidebar-rail-width)]",
          ].join(" ")}
        >
          <nav
            className={[
              "flex flex-1 flex-col gap-1 py-2 transition-[padding] duration-200",
              "px-2",
            ].join(" ")}
            aria-label="Primary"
          >
            {navSections.map((section) => (
              <div key={section.label} className="flex flex-col gap-1">
                {section.id === "dashboard" ? (
                  <NavLink
                    to={section.items[0]?.to ?? "/"}
                    end={section.items[0]?.end}
                    title={section.label}
                    className={({ isActive }) =>
                      navSectionButtonClass(isActive)
                    }
                  >
                    {section.icon}
                    <span
                      className={[
                        navLabelClass(expanded),
                        "text-[0.95rem] font-semibold",
                      ].join(" ")}
                    >
                      {section.label}
                    </span>
                  </NavLink>
                ) : (
                  <>
                <button
                  type="button"
                  title={section.label}
                  aria-expanded={openSection === section.id}
                  onClick={() => setOpenSection(section.id)}
                  className={navSectionButtonClass(activeSection === section.id)}
                >
                  {section.icon}
                  <span
                    className={[
                      navLabelClass(expanded),
                      "text-[0.95rem] font-semibold",
                    ].join(" ")}
                  >
                    {section.label}
                  </span>
                  {expanded ? (
                    <ChevronDownIcon
                      className={[
                        "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                        openSection === section.id ? "rotate-0" : "-rotate-90",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
                {expanded && openSection === section.id ? (
                  <div className="flex flex-col gap-1 pb-1">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        title={item.label}
                        className={({ isActive }) => navSubItemClass(isActive)}
                      >
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
                  </>
                )}
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-[var(--color-border)]">
            <nav
              className={[
                "flex flex-col gap-1 py-2 transition-[padding] duration-200",
                "px-2",
              ].join(" ")}
              aria-label="Account"
            >
              <button
                type="button"
                title="Settings"
                onClick={() => openSettings()}
                className={[
                  settingsOpen
                    ? [
                        navItemBase,
                        "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
                      ].join(" ")
                    : footerActionClass,
                  navItemLayout(expanded),
                ].join(" ")}
              >
                {SettingsIcon}
                <span className={navLabelClass(expanded)}>Settings</span>
              </button>
              <button
                type="button"
                title="Logout"
                onClick={() => void logout()}
                className={[footerActionClass, navItemLayout(expanded)].join(
                  " ",
                )}
              >
                {LogoutIcon}
                <span className={navLabelClass(expanded)}>Logout</span>
              </button>
            </nav>

            <div className="box-border flex h-[var(--shell-bottom-bar-height)] min-h-[var(--shell-bottom-bar-height)] items-center border-t border-[var(--color-border)]">
              <div
                className={[
                  "flex h-full w-full items-center gap-2 transition-[padding] duration-200",
                  "px-2",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={togglePin}
                  aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
                  aria-pressed={pinned}
                  title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
                  className={[
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                    pinned
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]",
                  ].join(" ")}
                >
                  <PinIcon solid={pinned} />
                </button>
                <div
                  className={["min-w-0", navLabelClass(expanded)].join(" ")}
                  title={`${user?.displayName ?? "User"} — ${formatLastLogin(user?.lastLoginAt)}`}
                >
                  <span className="block truncate text-sm font-medium text-[var(--color-ink)]">
                    {user?.displayName}
                  </span>
                  <span className="block truncate text-[0.7rem] text-[var(--color-muted)]">
                    {formatLastLogin(user?.lastLoginAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
