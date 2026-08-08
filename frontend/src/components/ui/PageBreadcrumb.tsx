import { Fragment } from "react";
import { Link } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

type PageBreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

function BreadcrumbChevron() {
  return (
    <svg
      className="page-breadcrumb__chevron"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PageBreadcrumb({
  items,
  className = "",
}: PageBreadcrumbProps) {
  if (!items.length) {
    return null;
  }

  return (
    <nav
      className={`page-breadcrumb ${className}`.trim()}
      aria-label="Breadcrumb"
    >
      <ol className="page-breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (
                <li className="page-breadcrumb__sep" aria-hidden="true">
                  <BreadcrumbChevron />
                </li>
              ) : null}
              <li className="page-breadcrumb__item">
                {isLast ? (
                  <span
                    className="page-breadcrumb__current"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : item.to ? (
                  <Link to={item.to} className="page-breadcrumb__link">
                    {item.label}
                  </Link>
                ) : (
                  <span className="page-breadcrumb__link page-breadcrumb__link--static">
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
