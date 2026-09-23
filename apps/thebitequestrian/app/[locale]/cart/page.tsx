import type { Metadata } from 'next';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n/dictionaries';
import { CartClient } from '@/components/cart-client';

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);
  return { title: dict.cart.title };
}

export default function CartPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-12">
      <h1 className="font-display text-4xl tracking-tight md:text-5xl">{dict.cart.title}</h1>
      <div className="mt-8">
        <CartClient locale={locale} dict={dict} />
      </div>
    </div>
  );
}
