'use client';

import Link from 'next/link';
import { Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

const TAX_RATE = 0.19;

export function CartClient({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { items, subtotal, updateQty, removeItem } = useCart();

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl tracking-tight">{dict.cart.emptyTitle}</h1>
        <p className="mx-auto mt-4 max-w-[40ch] font-body text-[15px] leading-relaxed text-muted">
          {dict.cart.emptyBody}
        </p>
        <Link
          href={`/${locale}/catalog`}
          className="mt-8 inline-flex items-center gap-2 rounded-sm bg-foreground px-6 py-3.5 font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground"
        >
          {dict.cart.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variant ?? ''}`}
            className="flex gap-5 border-b border-border pb-6"
          >
            <Link
              href={`/product/${item.productId}/${item.slug}`}
              className="block h-28 w-20 shrink-0 overflow-hidden rounded-sm border border-border bg-elevated"
              style={
                item.image
                  ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { backgroundImage: 'linear-gradient(135deg, var(--elevated), var(--accent))' }
              }
            />
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-body text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                  {item.variant && (
                    <span className="font-label text-[11px] uppercase tracking-widest text-muted">
                      {dict.product.size}: {item.variant}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.variant)}
                  aria-label={dict.cart.remove}
                  className="text-muted transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 rounded-sm border border-border">
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, item.variant, item.qty - 1)}
                    aria-label="-"
                    className="px-2.5 py-1.5 text-muted transition-colors hover:text-foreground"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-body text-[13px]">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, item.variant, item.qty + 1)}
                    aria-label="+"
                    className="px-2.5 py-1.5 text-muted transition-colors hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="font-body text-sm font-medium">
                  {formatPrice(item.effective_price * item.qty, locale)}
                </span>
              </div>
            </div>
          </div>
        ))}
        <Link
          href={`/${locale}/catalog`}
          className="w-fit font-label text-xs uppercase tracking-widest text-muted transition-colors hover:text-foreground"
        >
          {dict.cart.continueShopping}
        </Link>
      </div>

      <aside className="h-fit rounded-sm border border-border bg-surface p-6">
        <h2 className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
          {dict.cart.orderSummary}
        </h2>
        <dl className="mt-5 flex flex-col gap-3 font-body text-[14px]">
          <div className="flex justify-between text-muted">
            <dt>{dict.cart.subtotal}</dt>
            <dd className="text-foreground">{formatPrice(subtotal, locale)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>{dict.cart.shipping}</dt>
            <dd className="text-foreground">{dict.cart.freeShippingNote}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>{dict.cart.tax}</dt>
            <dd className="text-foreground">{formatPrice(tax, locale)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-4 text-base font-semibold">
            <dt>{dict.cart.total}</dt>
            <dd>{formatPrice(total, locale)}</dd>
          </div>
        </dl>
        <p className="mt-4 font-body text-[12px] text-muted">{dict.cart.estimatedDelivery}</p>
        <Link
          href={`/${locale}/checkout`}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-sm bg-foreground font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground"
        >
          {dict.cart.checkout}
        </Link>
      </aside>
    </div>
  );
}
