import { PageHeader } from "@/components/ui/PageHeader";

type SectionPageProps = {
  section: string;
  page: string;
};

export function SectionPage({ section, page }: SectionPageProps) {
  return (
    <section>
      <PageHeader
        items={[{ label: "Dashboard", to: "/" }, { label: section }, { label: page }]}
      />
    </section>
  );
}
