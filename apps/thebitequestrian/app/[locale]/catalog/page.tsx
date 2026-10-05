import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n/dictionaries';
import { getCategoryTree, getProducts } from '@/lib/api/client';
import type { Category } from '@/lib/api/types';
import { siteUrl } from '@/lib/seo';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/breadcrumbs';
import { CatalogSort } from '@/components/catalog-sort';
import { SectionHeading } from '@/components/section-heading';

// findCategoryBySlug walks the tree (any depth) to locate the node behind
// the current ?category= slug, so the sidebar can show its subcategories.
function findCategoryBySlug(nodes: Category[], slug: string): Category | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = findCategoryBySlug(node.children ?? [], slug);
    if (found) return found;
  }
  return undefined;
}

type SearchParams = { [key: string]: string | string[] | undefined };

function coerceString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

function coercePage(value: string | string[] | undefined): number {
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  return 1;
}

function buildQuery(category: string | undefined, search: string | undefined): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}): Promise<Metadata> {
  const locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);
  const category = coerceString(searchParams.category);
  const base = siteUrl();
  const categoryName = category
    ? (findCategoryBySlug(await getCategoryTree(), category)?.name ?? category)
    : undefined;
  const title = categoryName ? `${categoryName} — ${dict.catalog.title}` : dict.catalog.title;
  return {
    title,
    description: dict.catalog.subtitle,
    alternates: {
      canonical: `${base}/${locale}/catalog`,
      languages: {
        es: `${base}/es/catalog`,
        en: `${base}/en/catalog`,
      },
    },
  };
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);

  const category = coerceString(searchParams.category);
  const search = coerceString(searchParams.search);
  const page = coercePage(searchParams.page);

  const [categories, result] = await Promise.all([
    getCategoryTree(),
    getProducts({ category, search, page, per_page: 24 }),
  ]);

  const activeCategory = category ? findCategoryBySlug(categories, category) : undefined;
  const sidebarCategories = activeCategory ? (activeCategory.children ?? []) : categories;

  const query = buildQuery(category, search);
  const prevHref = page > 1 ? `/${locale}/catalog${query}${query ? '&' : '?'}page=${page - 1}` : null;
  const nextHref =
    page < result.total_pages
      ? `/${locale}/catalog${query}${query ? '&' : '?'}page=${page + 1}`
      : null;

  const heading = activeCategory?.name ?? category ?? (search ? `“${search}”` : dict.catalog.title);
  const headingIsCategory = Boolean(category);

  const breadcrumbItems: BreadcrumbItem[] =
    activeCategory && activeCategory.path?.length
      ? activeCategory.path.map((p, i, arr) => ({
          label: p.name,
          href: i < arr.length - 1 ? `/${locale}/catalog?category=${p.slug}` : undefined,
        }))
      : [{ label: heading }];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Breadcrumbs
        items={breadcrumbItems}
        locale={locale}
        dict={dict}
      />

      <div className="mt-6 flex flex-col gap-2">
        {headingIsCategory ? (
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">{heading}</h1>
        ) : (
          <SectionHeading
            eyebrow={dict.brand.label}
            title={dict.catalog.title}
          />
        )}
        <p className="max-w-2xl font-body text-[15px] leading-relaxed text-muted">
          {dict.catalog.subtitle}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="flex h-fit flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="font-label text-[11px] uppercase tracking-widest text-muted">
              {dict.catalog.filterLabel}
            </span>
            {sidebarCategories.map((cat) => {
              const active = cat.slug === category;
              return (
                <Link
                  key={cat.id}
                  href={`/${locale}/catalog?category=${encodeURIComponent(cat.slug)}`}
                  className={`flex items-center justify-between rounded-sm px-3 py-2 font-body text-[13px] transition-colors ${
                    active
                      ? 'bg-foreground text-background'
                      : 'text-foreground hover:bg-surface'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-muted">{cat.total_product_count}</span>
                </Link>
              );
            })}
            {category && (
              <Link
                href={`/${locale}/catalog`}
                className="mt-1 font-label text-[11px] uppercase tracking-widest text-accent-bright hover:underline"
              >
                {dict.catalog.clearFilters}
              </Link>
            )}
          </div>
        </aside>

        <div className="flex flex-col gap-6">
          {result.data.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <h2 className="font-display text-3xl tracking-tight">
                {dict.catalog.emptyTitle}
              </h2>
              <p className="max-w-[40ch] font-body text-[14px] leading-relaxed text-muted">
                {dict.catalog.emptyBody}
              </p>
              <Link
                href={`/${locale}/catalog`}
                className="mt-2 inline-flex items-center gap-2 rounded-sm bg-foreground px-6 py-3.5 font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground"
              >
                {dict.catalog.viewAll}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-body text-[13px] text-muted">
                  {dict.catalog.showing}{' '}
                  <span className="text-foreground">
                    {dict.catalog.results.replace('{count}', String(result.total))}
                  </span>
                </span>
              </div>
              <CatalogSort products={result.data} locale={locale} dict={dict} />

              {(prevHref || nextHref) && (
                <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                  {prevHref ? (
                    <Link
                      href={prevHref}
                      className="rounded-sm border border-border px-5 py-2.5 font-label text-xs uppercase tracking-widest transition-colors hover:border-foreground"
                    >
                      ← {dict.catalog.prev}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {nextHref && (
                    <Link
                      href={nextHref}
                      className="rounded-sm border border-border px-5 py-2.5 font-label text-xs uppercase tracking-widest transition-colors hover:border-foreground"
                    >
                      {dict.catalog.next} →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
