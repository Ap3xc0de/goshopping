'use client';

import { useState } from 'react';
import { SizeSelector } from '@/components/size-selector';
import { AddToCartButton } from '@/components/add-to-cart-button';
import type { Product } from '@/lib/api/types';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

export function ProductBuyBox({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
}) {
  const [size, setSize] = useState<string>(dict.sizes[0]);

  return (
    <div className="flex flex-col gap-5">
      <SizeSelector sizes={dict.sizes} value={size} onChange={setSize} dict={dict} />
      <AddToCartButton product={product} locale={locale} dict={dict} size={size} />
      <p className="font-body text-[12px] leading-relaxed text-muted">
        {dict.product.shippingNote}
      </p>
    </div>
  );
}
