import type { Locale } from '@/lib/i18n/dictionaries';
import type { Product } from '@/lib/api/types';

export const siteUrl = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const BRAND_NAME = 'The Bit Equestrian';
const INSTAGRAM = 'https://www.instagram.com/thebit_equestrian';

export function organizationJsonLd(): object {
  const url = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url,
    sameAs: [INSTAGRAM],
    logo: `${url}/logo.svg`,
  };
}

export function webSiteJsonLd(): object {
  const url = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/catalog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function productJsonLd(p: Product, locale: Locale): object {
  const url = siteUrl();
  const availability =
    p.status === 'out_of_stock' || p.stock <= 0
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    description: p.description,
    image: p.images?.[0] ?? `${url}/og.png`,
    offers: {
      '@type': 'Offer',
      price: p.effective_price,
      priceCurrency: 'USD',
      availability,
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): object {
  const url = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${url}${item.path}`,
    })),
  };
}
