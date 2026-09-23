'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import type { CreateOrderRequest, CreateOrderResponse, QuoteResponse, ShippingMethod } from '@/lib/api/types';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

const inputClass =
  'w-full rounded-sm border border-border bg-background px-3 py-2.5 font-body text-[13px] text-foreground outline-none placeholder:text-muted focus:border-accent-bright';

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  error?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-label text-[11px] uppercase tracking-widest text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`${inputClass} ${error ? 'border-red-500' : ''}`}
      />
    </label>
  );
}

export function CheckoutClient({
  locale,
  dict,
  shippingMethods,
}: {
  locale: Locale;
  dict: Dictionary;
  shippingMethods: ShippingMethod[];
}) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [shippingMethod, setShippingMethod] = useState(shippingMethods[0]?.code ?? '');

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // quote-driven totals (shipping-zones REQ: Quote Carrier Cost) — the server
  // computes subtotal/tax/shipping_total/total; the client never re-derives
  // them locally (no client-side TAX_RATE).
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const itemsKey = items.map((i) => `${i.productId}:${i.qty}`).join('|');

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ product_id: i.productId, quantity: i.qty })),
        shipping_method: shippingMethod || undefined,
      }),
    })
      .then((res) => (res.ok ? (res.json() as Promise<QuoteResponse>) : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setQuote(data);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, shippingMethod]);

  const displaySubtotal = quote?.subtotal_before_discount ?? subtotal;
  const shippingTotal = quote?.shipping_total ?? 0;
  const tax = quote?.tax ?? 0;
  const total = quote?.total ?? subtotal;

  function validate(): boolean {
    const next: Record<string, boolean> = {
      firstName: firstName.trim().length === 0,
      lastName: lastName.trim().length === 0,
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
      street: street.trim().length === 0,
      state: state.trim().length === 0,
      zip: zip.trim().length === 0,
      city: city.trim().length === 0,
      country: country.trim().length === 0,
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    if (items.length === 0) {
      setSubmitError(dict.cart.emptyBody);
      return;
    }

    const payload: CreateOrderRequest = {
      customer_name: `${firstName} ${lastName}`.trim(),
      customer_email: email.trim(),
      customer_phone: phone.trim() || undefined,
      shipping_address: {
        street: apartment.trim() ? `${street.trim()}, ${apartment.trim()}` : street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim() || undefined,
      },
      items: items.map((i) => ({ product_id: i.productId, quantity: i.qty })),
      shipping_method: shippingMethod || undefined,
    };

    setPending(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'checkout failed');
      }
      const data = (await res.json()) as CreateOrderResponse;
      clear();
      router.push(`/${locale}/order/${data.order.id}?token=${encodeURIComponent(data.access_token)}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'checkout failed');
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1fr_380px]">
      <form id="checkout-form" onSubmit={handleSubmit} className="flex flex-col gap-10" noValidate>
        <section className="flex flex-col gap-4">
          <h2 className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
            1 · {dict.checkout.contact}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={dict.checkout.firstName} value={firstName} onChange={setFirstName} error={errors.firstName} />
            <Field label={dict.checkout.lastName} value={lastName} onChange={setLastName} error={errors.lastName} />
            <Field label={dict.checkout.email} value={email} onChange={setEmail} type="email" error={errors.email} />
            <Field label={dict.checkout.phone} value={phone} onChange={setPhone} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
            2 · {dict.checkout.shippingAddress}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={dict.checkout.street} value={street} onChange={setStreet} error={errors.street} />
            </div>
            <Field label={dict.checkout.apartment} value={apartment} onChange={setApartment} />
            <Field label={dict.checkout.city} value={city} onChange={setCity} error={errors.city} />
            <Field label={dict.checkout.state} value={state} onChange={setState} error={errors.state} />
            <Field label={dict.checkout.postalCode} value={zip} onChange={setZip} error={errors.zip} />
            <Field label={dict.checkout.country} value={country} onChange={setCountry} error={errors.country} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
            3 · {dict.checkout.delivery}
          </h2>
          <div className="flex flex-col gap-2">
            {shippingMethods.map((opt) => (
              <label
                key={opt.code}
                className={`flex cursor-pointer items-center justify-between rounded-sm border px-4 py-3 ${
                  shippingMethod === opt.code ? 'border-foreground' : 'border-border'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    value={opt.code}
                    checked={shippingMethod === opt.code}
                    onChange={() => setShippingMethod(opt.code)}
                    className="accent-accent-bright"
                  />
                  <span className="flex flex-col">
                    <span className="font-body text-sm text-foreground">{opt.name}</span>
                    <span className="font-body text-[12px] text-muted">{opt.zone.name}</span>
                  </span>
                </span>
                <span className="font-body text-[13px] text-accent-bright">
                  {shippingMethod === opt.code
                    ? formatPrice(shippingTotal, locale)
                    : opt.base_price > 0
                      ? formatPrice(opt.base_price, locale)
                      : dict.checkout.free}
                </span>
              </label>
            ))}
            {shippingMethods.length === 0 && (
              <p className="font-body text-[13px] text-muted">{dict.cart.freeShippingNote}</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
            4 · {dict.checkout.payment}
          </h2>
          <div className="grid grid-cols-1 gap-4 rounded-sm border border-border bg-surface p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-[11px] uppercase tracking-widest text-muted">
                  {dict.checkout.cardNumber}
                </span>
                <input type="text" disabled placeholder="•••• •••• •••• ••••" className={`${inputClass} disabled:opacity-60`} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-[11px] uppercase tracking-widest text-muted">
                {dict.checkout.expiry}
              </span>
              <input type="text" disabled placeholder="MM/AA" className={`${inputClass} disabled:opacity-60`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-[11px] uppercase tracking-widest text-muted">
                {dict.checkout.cvc}
              </span>
              <input type="text" disabled placeholder="•••" className={`${inputClass} disabled:opacity-60`} />
            </label>
          </div>
          <p className="font-body text-[12px] text-muted">{dict.checkout.orderNote}</p>
        </section>
      </form>

      <aside className="flex h-fit flex-col gap-6 rounded-sm border border-border bg-surface p-6">
        <h2 className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
          {dict.cart.orderSummary}
        </h2>
        <dl className="flex flex-col gap-3 font-body text-[14px]">
          <div className="flex justify-between text-muted">
            <dt>{dict.cart.subtotal}</dt>
            <dd className="text-foreground">{formatPrice(displaySubtotal, locale)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>{dict.cart.shipping}</dt>
            <dd className="text-foreground">
              {shippingTotal > 0 ? formatPrice(shippingTotal, locale) : dict.checkout.free}
            </dd>
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

        {submitError && (
          <p className="rounded-sm border border-red-500/40 bg-red-500/10 px-3 py-2 font-body text-[13px] text-red-400">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          form="checkout-form"
          disabled={pending || quoteLoading || items.length === 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-foreground font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
        >
          {pending
            ? dict.checkout.processing
            : dict.checkout.pay.replace('{total}', formatPrice(total, locale))}
        </button>
        <span className="text-center font-body text-[12px] text-muted">
          {dict.checkout.paySecurely}
        </span>
        <Link
          href={`/${locale}/cart`}
          className="text-center font-label text-xs uppercase tracking-widest text-muted transition-colors hover:text-foreground"
        >
          {dict.checkout.backToCart}
        </Link>
      </aside>
    </div>
  );
}
