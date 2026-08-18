import { PageBreadcrumb, type BreadcrumbItem } from "@/components/ui/PageBreadcrumb";

type PageHeaderProps = {
  items: BreadcrumbItem[];
};

/**
 * Standard page header. Always renders breadcrumbs — never a title/description block.
 */
export function PageHeader({ items }: PageHeaderProps) {
  return (
    <header className="mb-3">
      <PageBreadcrumb items={items} />
    </header>
  );
}
