import { FormPanel } from "@/components/forms";
import type { ThemeMode } from "@/contexts/themeTypes";
import { useApiHealth } from "@/hooks/useApiHealth";
import { env } from "@/types/env";
import { useTheme } from "@/hooks/useTheme";

const themeOptions: { id: ThemeMode; label: string; hint: string }[] = [
  {
    id: "light",
    label: "Light",
    hint: "Warm cream editorial",
  },
  {
    id: "dark",
    label: "Dark",
    hint: "Warm charcoal editorial",
  },
];

const rootFontSizeOptions = [
  { value: 0, label: "Default", hint: "16px" },
  { value: 1, label: "Large", hint: "17px" },
  { value: 2, label: "Larger", hint: "18px" },
  { value: 3, label: "Largest", hint: "19px" },
] as const;

export function GeneralTab() {
  const { theme, setTheme, rootFontSizeIncrement, setRootFontSizeIncrement } =
    useTheme();
  const { liveQuery, readyQuery } = useApiHealth();

  return (
    <FormPanel title="General" wide hideHeader>
      <div className="space-y-4">
        <section>
          <p className="mb-3 text-[0.875rem] text-[var(--color-muted)]">
            Choose light or dark mode for the app.
          </p>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid gap-2 sm:grid-cols-2"
          >
            {themeOptions.map((option) => {
              const isSelected = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setTheme(option.id)}
                  className={[
                    "rounded-[0.45rem] border px-[0.6rem] py-[0.35rem] text-left transition-colors",
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]",
                  ].join(" ")}
                >
                  <span className="block text-[0.9375rem] font-medium text-[var(--color-ink)]">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[0.875rem] text-[var(--color-muted)]">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h3 className="text-[0.875rem] font-semibold text-[var(--color-ink)]">
              Root font size
            </h3>
            <p className="text-[0.875rem] text-[var(--color-muted)]">
              Increase the app's base font size for easier reading.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Root font size"
            className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          >
            {rootFontSizeOptions.map((option) => {
              const isSelected = rootFontSizeIncrement === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setRootFontSizeIncrement(option.value)}
                  className={[
                    "rounded-[0.45rem] border px-[0.6rem] py-[0.35rem] text-left transition-colors",
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]",
                  ].join(" ")}
                >
                  <span className="block text-[0.9375rem] font-medium text-[var(--color-ink)]">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[0.875rem] text-[var(--color-muted)]">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h3 className="text-[0.875rem] font-semibold text-[var(--color-ink)]">
              API status
            </h3>
            <p className="text-[0.875rem] text-[var(--color-muted)]">
              Live service and database readiness checks.
            </p>
          </div>

          {!env.enableApiHealthCheck ? (
            <p className="text-[0.875rem] text-[var(--color-muted)]">
              API health checks are disabled by configuration.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-[0.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <h4 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  Liveness
                </h4>
                {liveQuery.isLoading ? (
                  <p className="text-[0.875rem] text-[var(--color-muted)]">Checking…</p>
                ) : liveQuery.isError ? (
                  <p className="text-[0.875rem] text-[var(--color-danger)]">
                    {(liveQuery.error as Error).message}
                  </p>
                ) : (
                  <dl className="space-y-1 text-[0.875rem] text-[var(--color-ink)]">
                    <div className="flex justify-between gap-4">
                      <dt>Status</dt>
                      <dd>{liveQuery.data?.status}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Service</dt>
                      <dd>{liveQuery.data?.service}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Environment</dt>
                      <dd>{liveQuery.data?.environment}</dd>
                    </div>
                  </dl>
                )}
              </article>

              <article className="rounded-[0.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <h4 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  Readiness
                </h4>
                {readyQuery.isLoading ? (
                  <p className="text-[0.875rem] text-[var(--color-muted)]">Checking…</p>
                ) : readyQuery.isError ? (
                  <p className="text-[0.875rem] text-[var(--color-danger)]">
                    {(readyQuery.error as Error).message}
                  </p>
                ) : (
                  <dl className="space-y-1 text-[0.875rem] text-[var(--color-ink)]">
                    <div className="flex justify-between gap-4">
                      <dt>Status</dt>
                      <dd>{readyQuery.data?.status}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Database</dt>
                      <dd>{readyQuery.data?.database}</dd>
                    </div>
                    {readyQuery.data?.detail ? (
                      <div className="flex justify-between gap-4">
                        <dt>Detail</dt>
                        <dd>{readyQuery.data.detail}</dd>
                      </div>
                    ) : null}
                  </dl>
                )}
              </article>
            </div>
          )}
        </section>
      </div>
    </FormPanel>
  );
}
