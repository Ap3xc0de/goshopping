import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n/dictionaries';
import { getProduct, NotFoundError } from '@/lib/api/client';
import { formatPrice, slugify } from '@/lib/format';
import { siteUrl, productJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ProductBuyBox } from '@/components/product-buy-box';

type Params = { [key: string]: string | string[] | undefined };

function coerceId(params: Params): string {
  return typeof params.id === 'string' ? params.id : '';
}

function coerceLocale(params: Params): Locale {
  const raw = typeof params.locale === 'string' ? params.locale : '';
  return isLocale(raw) ? raw : 'es';
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = coerceLocale(params);
  const dict = getDictionary(locale);
  const id = coerceId(params);
  const base = siteUrl();

  if (!id) {
    return { title: dict.notFound.title };
  }

  try {
    const product = await getProduct(id);
    const slug = slugify(product.name);
    const description = product.description;
    return {
      title: product.name,
      description,
      alternates: {
        canonical: `${base}/${locale}/product/${id}/${slug}`,
        languages: {
          es: `${base}/es/product/${id}/${slug}`,
          en: `${base}/en/product/${id}/${slug}`,
        },
      },
      openGraph: {
        title: product.name,
        description,
        url: `${base}/${locale}/product/${id}/${slug}`,
        images: product.images[0] ? [{ url: product.images[0] }] : undefined,
        type: 'website',
      },
    };
  } catch (err) {
    if (err instanceof NotFoundError) return { title: dict.notFound.title };
    return { title: dict.notFound.title };
  }
}

export default async function ProductPage({ params }: { params: Params }) {
  const locale = coerceLocale(params);
  const dict = getDictionary(locale);
  const id = coerceId(params);

  if (!id) notFound();

  let product;
  try {
    product = await getProduct(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const canonical = slugify(product.name);
  const slugArr = Array.isArray(params.slug) ? params.slug : [];
  if (slugArr.length === 0 || slugArr[0] !== canonical) {
    permanentRedirect(`/${locale}/product/${id}/${canonical}`);
  }

  const outOfStock = product.status === 'out_of_stock' || product.stock <= 0;
  const lowStock = !outOfStock && product.stock > 0 && product.stock <= 15;
  const hasOffer = product.active_offer != null && product.effective_price < product.price;

  const breadcrumbs = [
    {
      label: product.category,
      href: `/${locale}/catalog?category=${encodeURIComponent(product.category)}`,
    },
    { label: product.name },
  ];

  const productLd = productJsonLd(product, locale);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: dict.catalog.breadcrumbHome, path: `/${locale}` },
    { name: product.category, path: `/${locale}/catalog?category=${encodeURIComponent(product.category)}` },
    { name: product.name, path: `/${locale}/product/${id}/${canonical}` },
  ]);

  const images = product.images.length > 0 ? product.images : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <Breadcrumbs items={breadcrumbs} locale={locale} dict={dict} />

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div
            className="aspect-[3/4] w-full overflow-hidden rounded-sm border border-border bg-elevated bg-cover bg-center"
            style={
              images[0]
                ? { backgroundImage: `url(${images[0]})` }
                : {
                    backgroundImage:
                      'linear-gradient(135deg, var(--elevated) 0%, var(--accent) 100%)',
                  }
            }
          />
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  className="h-20 w-16 shrink-0 rounded-sm border border-border bg-elevated bg-cover bg-center"
                  style={{ backgroundImage: `url(${img})` }}
                  aria-label={`${dict.product.colour} ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <span className="font-label text-[11px] uppercase tracking-[0.2em] text-muted">
            {product.category}
          </span>
          <h1 className="font-display text-4xl leading-tight tracking-tight md:text-5xl">
            {product.name}
          </h1>

          <div className="flex items-center gap-4">
            <span className="font-body text-xl font-semibold">
              {hasOffer ? (
                <>
                  <span className="text-accent-bright">
                    {formatPrice(product.effective_price, locale)}
                  </span>{' '}
                  <span className="text-base font-normal text-muted line-through">
                    {formatPrice(product.price, locale)}
                  </span>
                </>
              ) : (
                formatPrice(product.price, locale)
              )}
            </span>
            <span className="font-body text-[13px] text-muted">
              ★ 4.8 · 214 {dict.product.reviews}
            </span>
          </div>

          <p className="font-body text-[15px] leading-relaxed text-muted">
            {product.description}
          </p>

          <ProductBuyBox product={product} locale={locale} dict={dict} />

          <div className="mt-2 flex flex-col gap-2 rounded-sm border border-border bg-surface p-5">
            <span className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
              {dict.product.details}
            </span>
            <p className="font-body text-[13px] leading-relaxed text-muted">
              {product.description}
            </p>
            <dl className="mt-2 flex flex-col gap-1.5 font-body text-[13px]">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted">{dict.product.sku}</dt>
                <dd>{product.sku}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted">{dict.product.colour}</dt>
                <dd>{product.category}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted">{dict.product.price}</dt>
                <dd>
                  {outOfStock ? (
                    <span className="text-muted">{dict.product.outOfStock}</span>
                  ) : lowStock ? (
                    <span className="text-accent-bright">{dict.product.lowStock}</span>
                  ) : (
                    <span className="text-accent-bright">{dict.product.inStock}</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
