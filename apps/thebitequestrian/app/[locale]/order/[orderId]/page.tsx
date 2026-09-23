import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n/dictionaries';
import { getOrderStatus } from '@/lib/api/client';
import { siteUrl } from '@/lib/seo';

type Params = { [key: string]: string | string[] | undefined };
type SearchParams = { [key: string]: string | string[] | undefined };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = typeof params.locale === 'string' && isLocale(params.locale) ? params.locale : 'es';
  const orderId = typeof params.orderId === 'string' ? params.orderId : '';
  return {
    title: getDictionary(locale).order.title,
    robots: { index: false, follow: false },
    alternates: { canonical: `${siteUrl()}/${locale}/order/${orderId}` },
  };
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale: Locale =
    typeof params.locale === 'string' && isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);

  const orderId = typeof params.orderId === 'string' ? params.orderId : '';
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';

  let status = 'placed';
  try {
    const result = await getOrderStatus(orderId, token);
    status = result.status;
  } catch {
    status = 'placed';
  }

  const shortId = orderId.slice(0, 8).toUpperCase();

  const steps = [
    { key: 'placed', label: dict.order.timeline.placed },
    { key: 'picked', label: dict.order.timeline.picked },
    { key: 'inTransit', label: dict.order.timeline.inTransit },
    { key: 'delivered', label: dict.order.timeline.delivered },
  ];

  const doneUpTo = status === 'processing' || status === 'picked' ? 1 : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
      <span className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
        {dict.order.orderNumber} · {shortId}
      </span>
      <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">
        {dict.order.title}
      </h1>
      <p className="mt-4 max-w-[42ch] font-body text-[15px] leading-relaxed text-muted">
        {dict.order.subtitle}
      </p>

      <div className="mt-12 flex w-full flex-col gap-0">
        {steps.map((step, i) => {
          const done = i <= doneUpTo;
          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-label text-[11px] ${
                    done
                      ? 'border-accent-bright bg-accent text-accent-foreground'
                      : 'border-border text-muted'
                  }`}
                >
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span
                    className={`w-px flex-1 ${done ? 'bg-accent-bright' : 'bg-border'}`}
                    style={{ minHeight: '28px' }}
                  />
                )}
              </div>
              <span
                className={`pt-1.5 font-body text-[14px] ${
                  done ? 'text-foreground' : 'text-muted'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <Link
        href={`/${locale}/catalog`}
        className="mt-12 inline-flex items-center gap-2 rounded-sm bg-foreground px-6 py-3.5 font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground"
      >
        {dict.order.keepShopping}
      </Link>
    </div>
  );
}
