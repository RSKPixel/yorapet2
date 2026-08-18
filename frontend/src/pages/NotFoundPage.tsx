import { Link } from "react-router-dom";

import { PageHeader } from "@/components/ui/PageHeader";

export function NotFoundPage() {
  return (
    <section>
      <PageHeader items={[{ label: "Home", to: "/" }, { label: "Page not found" }]} />
      <Link to="/" className="text-sm font-medium text-[var(--color-accent)] underline">
        Back to home
      </Link>
    </section>
  );
}
