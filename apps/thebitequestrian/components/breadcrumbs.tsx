import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  locale,
  dict,
}: {
  items: BreadcrumbItem[];
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 font-label text-[11px] uppercase tracking-widest text-muted"
    >
      <Link href={`/${locale}`} className="transition-colors hover:text-foreground">
        {dict.catalog.breadcrumbHome}
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span aria-hidden className="text-accent-bright">
            /
          </span>
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
