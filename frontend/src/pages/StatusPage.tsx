import { PageHeader } from "@/components/ui/PageHeader";
import { useApiHealth } from "@/hooks/useApiHealth";
import { env } from "@/types/env";

export function StatusPage() {
  const { liveQuery, readyQuery } = useApiHealth();

  return (
    <section>
      <PageHeader items={[{ label: "Home", to: "/" }, { label: "API Status" }]} />

      {!env.enableApiHealthCheck ? (
        <p className="text-sm text-[var(--color-muted)]">
          API health checks are disabled by configuration.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Liveness
            </h2>
            {liveQuery.isLoading ? (
              <p className="text-sm">Checking…</p>
            ) : liveQuery.isError ? (
              <p className="text-sm text-[var(--color-danger)]">
                {(liveQuery.error as Error).message}
              </p>
            ) : (
              <dl className="space-y-1 text-sm">
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

          <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Readiness
            </h2>
            {readyQuery.isLoading ? (
              <p className="text-sm">Checking…</p>
            ) : readyQuery.isError ? (
              <p className="text-sm text-[var(--color-danger)]">
                {(readyQuery.error as Error).message}
              </p>
            ) : (
              <dl className="space-y-1 text-sm">
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
  );
}
