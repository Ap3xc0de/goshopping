import type { Metadata } from 'next';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n/dictionaries';
import { getShippingMethods } from '@/lib/api/client';
import { CheckoutClient } from '@/components/checkout-client';

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);
  return { title: dict.checkout.title };
}

export default async function CheckoutPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);
  const shippingMethods = await getShippingMethods();

  return (
    <div className="mx-auto max-w-7xl px-6 pt-12">
      <h1 className="font-display text-4xl tracking-tight md:text-5xl">{dict.checkout.title}</h1>
      <div className="mt-8">
        <CheckoutClient locale={locale} dict={dict} shippingMethods={shippingMethods} />
      </div>
    </div>
  );
}
