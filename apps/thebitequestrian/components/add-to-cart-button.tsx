'use client';

import { useState } from 'react';
import { slugify } from '@/lib/format';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/api/types';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

export function AddToCartButton({
  product,
  dict,
  size,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
  size: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const outOfStock = product.status === 'out_of_stock' || product.stock <= 0;

  function handleAdd(): void {
    addItem({
      productId: product.id,
      slug: slugify(product.name),
      name: product.name,
      sku: product.sku,
      price: product.price,
      effective_price: product.effective_price,
      image: product.images[0],
      variant: size,
      qty: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={outOfStock}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-foreground font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
    >
      {outOfStock ? dict.product.outOfStock : added ? dict.product.added : dict.product.addToCart}
    </button>
  );
}
