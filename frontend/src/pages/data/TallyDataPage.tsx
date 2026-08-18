import { useQuery } from "@tanstack/react-query";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { FormPanel } from "@/components/forms";
import { PageHeader } from "@/components/ui/PageHeader";
import { tallyDataService } from "@/services/tallyDataService";
import type { TallySyncStepResult } from "@/types/tallyData";

const sessionFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return sessionFormatter.format(date);
}

function stepLabel(step: TallySyncStepResult) {
  if (step.target_table === "yorapet_sales") {
    return "Sales";
  }
  if (step.target_table === "yorapet_purchase") {
    return "Purchases";
  }
  return step.target_table;
}

function SyncStepCard({ step }: { step: TallySyncStepResult }) {
  return (
    <article className="rounded-[0.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[0.9375rem] font-semibold text-[var(--color-ink)]">
          {stepLabel(step)}
        </h3>
        <span className="text-[0.8125rem] text-[var(--color-muted)]">
          {step.source_table} → {step.target_table}
        </span>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wide text-[var(--color-muted)]">
            Tally rows
          </dt>
          <dd className="text-[0.9375rem] font-medium text-[var(--color-ink)]">
            {step.source_count}
          </dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wide text-[var(--color-muted)]">
            Added
          </dt>
          <dd className="text-[0.9375rem] font-medium text-[var(--color-success)]">
            {step.added}
          </dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wide text-[var(--color-muted)]">
            Updated
          </dt>
          <dd className="text-[0.9375rem] font-medium text-[var(--color-accent)]">
            {step.updated}
          </dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wide text-[var(--color-muted)]">
            Unchanged
          </dt>
          <dd className="text-[0.9375rem] font-medium text-[var(--color-ink)]">
            {step.unchanged}
          </dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wide text-[var(--color-muted)]">
            Removed
          </dt>
          <dd className="text-[0.9375rem] font-medium text-[var(--color-danger)]">
            {step.removed}
          </dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wide text-[var(--color-muted)]">
            Before
          </dt>
          <dd className="text-[0.9375rem] font-medium text-[var(--color-ink)]">
            {step.target_count_before}
          </dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-wide text-[var(--color-muted)]">
            After
          </dt>
          <dd className="text-[0.9375rem] font-medium text-[var(--color-ink)]">
            {step.target_count_after}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function TallyDataPage() {
  const syncQuery = useQuery({
    queryKey: ["tally-data", "sync"],
    queryFn: () => tallyDataService.sync(),
    retry: false,
  });

  return (
    <section className="min-h-0 flex-1 overflow-auto">
      <PageHeader
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Data" },
          { label: "Tally Data" },
        ]}
      />

      <FormPanel wide hideHeader flat>
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[1rem] font-semibold text-[var(--color-ink)]">
                Tally sync
              </h2>
              <p className="mt-1 text-[0.875rem] text-[var(--color-muted)]">
                Compares Tally purchase and sales data and stores it in application
                tables when this page opens.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void syncQuery.refetch()}
              disabled={syncQuery.isFetching}
              className="inline-flex items-center gap-2 rounded-[0.45rem] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-[0.875rem] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-60"
            >
              <ArrowPathIcon
                className={["h-4 w-4", syncQuery.isFetching ? "animate-spin" : ""].join(
                  " ",
                )}
                aria-hidden="true"
              />
              {syncQuery.isFetching ? "Syncing…" : "Sync again"}
            </button>
          </div>

          {syncQuery.isLoading ? (
            <p className="text-[0.875rem] text-[var(--color-muted)]">
              Syncing purchase and sales data from Tally…
            </p>
          ) : syncQuery.isError ? (
            <p className="text-[0.875rem] text-[var(--color-danger)]" role="alert">
              {(syncQuery.error as Error).message}
            </p>
          ) : syncQuery.data ? (
            <div className="space-y-4">
              <div className="rounded-[0.5rem] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3">
                <p className="text-[0.9375rem] font-medium text-[var(--color-ink)]">
                  {syncQuery.data.message}
                </p>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-muted)]">
                  Session {formatTimestamp(syncQuery.data.started_at)} –{" "}
                  {formatTimestamp(syncQuery.data.completed_at)}
                </p>
              </div>

              {syncQuery.data.steps.map((step) => (
                <SyncStepCard key={step.target_table} step={step} />
              ))}
            </div>
          ) : null}
        </div>
      </FormPanel>
    </section>
  );
}
