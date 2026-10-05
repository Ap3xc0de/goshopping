import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary, isLocale, locales, type Locale } from '@/lib/i18n/dictionaries';
import { getProducts } from '@/lib/api/client';
import { siteUrl } from '@/lib/seo';
import { ProductCard } from '@/components/product-card';
import { SectionHeading } from '@/components/section-heading';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  const locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);
  const base = siteUrl();
  return {
    title: `${dict.brand.name} ${dict.brand.label} — ${dict.brand.tagline}`,
    description: dict.brand.blurb,
    alternates: {
      canonical: `${base}/${locale}`,
      languages: {
        es: `${base}/es`,
        en: `${base}/en`,
      },
    },
    openGraph: {
      title: `${dict.brand.name} ${dict.brand.label}`,
      description: dict.brand.blurb,
      url: `${base}/${locale}`,
      siteName: `${dict.brand.name} ${dict.brand.label}`,
      images: [{ url: `${base}/og.png` }],
      type: 'website',
    },
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);

  const featured = await getProducts({ per_page: 4 });

  const pillars = [
    { title: dict.home.pillarLifeTitle, body: dict.home.pillarLifeBody },
    { title: dict.home.pillarTrendyTitle, body: dict.home.pillarTrendyBody },
    { title: dict.home.pillarFabricsTitle, body: dict.home.pillarFabricsBody },
  ];

  const shopGroups = [
    {
      title: dict.home.womenTitle,
      href: `/${locale}/catalog?category=Women`,
      items: dict.home.womenTitles.map((label, i) => ({
        label,
        href: `/${locale}${dict.home.womenHrefs[i]}`,
      })),
    },
    {
      title: dict.home.menTitle,
      href: `/${locale}/catalog?category=Men`,
      items: dict.home.menTitles.map((label, i) => ({
        label,
        href: `/${locale}${dict.home.menHrefs[i]}`,
      })),
    },
  ];

  const casuals = {
    title: dict.home.casualTitle,
    href: `/${locale}/catalog?category=Casuals`,
    items: dict.home.casualTitles.map((label, i) => ({
      label,
      href: `/${locale}${dict.home.casualHrefs[i]}`,
    })),
  };

  return (
    <div className="flex flex-col">
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col justify-center gap-6 bg-accent/10 p-12 md:p-16">
            <span className="font-label text-[10px] uppercase tracking-[0.3em] text-accent-bright">
              {dict.brand.heroEyebrow}
            </span>
            <h1 className="font-display text-4xl leading-[1.06] tracking-tight md:text-5xl">
              {dict.brand.heroTitle}
            </h1>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/catalog?category=Women`}
                className="flex items-center gap-2 rounded-sm bg-foreground px-6 py-3.5 font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground"
              >
                {dict.home.womenTitle}
              </Link>
              <Link
                href={`/${locale}/catalog?category=Men`}
                className="rounded-sm border border-border px-6 py-3.5 font-label text-xs uppercase tracking-widest transition-colors hover:border-foreground"
              >
                {dict.home.menTitle}
              </Link>
            </div>
          </div>
          <div
            className="min-h-[320px] bg-cover bg-center md:min-h-[520px]"
            style={{
              backgroundImage:
                'url(/banner.jpeg), linear-gradient(135deg, var(--elevated), var(--accent))',
            }}
          />
        </div>
      </section>

      

      {/* <section className="border-y border-border bg-elevated">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="font-display text-2xl leading-snug tracking-tight md:text-3xl">
            {dict.brand.garmentsBody}
          </p>
        </div>
      </section> */}

      {/* <section className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-16 md:py-20">
          <span className="font-label text-[10px] uppercase tracking-[0.3em] text-accent-bright">
            {dict.brand.storyTitle}
          </span>
          <p className="max-w-3xl font-body text-[15px] leading-relaxed text-muted">
            {dict.brand.storyBody}
          </p>
          <p className="max-w-2xl font-display text-2xl italic leading-snug text-foreground">
            “{dict.brand.championsBody}”
          </p>
        </div>
      </section> */}

      {/* <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="flex flex-col gap-3 rounded-sm border border-border p-6">
              <span className="font-display text-lg text-accent-bright">{p.title}</span>
              <p className="font-body text-[14px] leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* <section className="border-t border-border bg-elevated">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-16">
          <p className="font-display text-3xl leading-tight tracking-tight md:text-4xl">
            {dict.brand.wearBody}
          </p>
          <div className="flex flex-col gap-2">
            <span className="font-label text-[10px] uppercase tracking-[0.3em] text-accent-bright">
              {dict.brand.tagline}
            </span>
            <h2 className="font-display text-xl tracking-tight md:text-2xl">{casuals.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {casuals.items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center justify-between rounded-sm border border-border bg-surface px-5 py-5 transition-colors hover:border-accent-bright"
              >
                <span className="font-body text-[13px] font-medium tracking-wide text-foreground">
                  {item.label}
                </span>
                <span className="font-label text-xs text-accent-bright opacity-0 transition-opacity group-hover:opacity-100">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section> */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeading
          eyebrow={dict.brand.tagline}
          title={dict.home.newArrivals}
          viewAllHref={`/${locale}/catalog`}
          viewAllLabel={dict.home.viewAll}
        />
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {featured.data.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} dict={dict} />
          ))}
        </div>
      </section>
    </div>
  );
}
