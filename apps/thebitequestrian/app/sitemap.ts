import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/api/client';
import { defaultLocale } from '@/lib/i18n/dictionaries';
import { siteUrl } from '@/lib/seo';
import { slugify } from '@/lib/format';

const locales = ['es', 'en'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const loc of locales) {
    entries.push({
      url: `${base}/${loc}`,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: {
          es: `${base}/es`,
          en: `${base}/en`,
        },
      },
    });

    entries.push({
      url: `${base}/${loc}/catalog`,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          es: `${base}/es/catalog`,
          en: `${base}/en/catalog`,
        },
      },
    });
  }

  try {
    const result = await getProducts({ per_page: 100 });
    for (const product of result.data) {
      const slug = slugify(product.name);
      const path = `/product/${product.id}/${slug}`;
      entries.push({
        url: `${base}/${defaultLocale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: {
          languages: {
            es: `${base}/es${path}`,
            en: `${base}/en${path}`,
          },
        },
      });
    }
  } catch {
    // Ignore — return the locale + catalog entries on failure.
  }

  return entries;
}
