import Link from 'next/link';
import type { CSSProperties } from 'react';
import { slugify, formatPrice } from '@/lib/format';
import { cssUrl } from '@/lib/css';
import type { Product } from '@/lib/api/types';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

function productImageStyle(product: Product): CSSProperties {
  const url = product.images[0];
  if (url) {
    return { backgroundImage: cssUrl(url) };
  }
  return {
    backgroundImage:
      'linear-gradient(135deg, var(--elevated) 0%, var(--accent) 100%)',
  };
}

export function ProductCard({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
}) {
  const href = `/product/${product.id}/${slugify(product.name)}`;
  const outOfStock = product.status === 'out_of_stock' || product.stock <= 0;
  const lowStock = !outOfStock && product.stock > 0 && product.stock <= 15;
  const hasOffer =
    product.active_offer != null && product.effective_price < product.price;

  return (
    <Link href={href} className="group flex flex-col">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm border border-border bg-elevated">
        <div
          className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
          style={productImageStyle(product)}
        />
        {product.active_offer && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-sm bg-foreground px-2 py-1 font-label text-[10px] uppercase tracking-widest text-background">
            {product.active_offer.name}
          </span>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-sm bg-background/80 px-2 py-1 font-label text-[10px] uppercase tracking-widest text-muted">
            {dict.product.outOfStock}
          </span>
        )}
        {lowStock && (
          <span className="absolute bottom-2 left-2 rounded-sm bg-background/80 px-2 py-1 font-label text-[10px] uppercase tracking-widest text-accent-bright">
            {dict.product.lowStock}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 pt-3">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-muted">
          {product.category}
        </span>
        <span className="font-body text-sm font-medium leading-snug text-foreground">
          {product.name}
        </span>
        <span className="mt-1 font-body text-sm text-foreground">
          {hasOffer ? (
            <>
              <span className="text-accent-bright">
                {formatPrice(product.effective_price, locale)}
              </span>{' '}
              <span className="text-muted line-through">
                {formatPrice(product.price, locale)}
              </span>
            </>
          ) : (
            formatPrice(product.price, locale)
          )}
        </span>
      </div>
    </Link>
  );
}
