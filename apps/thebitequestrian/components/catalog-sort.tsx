'use client';

// NOTE: The core API ignores the `sort` query param, so this component only
// re-sorts the products already loaded for the current page. This is an
// acceptable MVP; server-side sorting is a future pass on the Go core.
import { useState } from 'react';
import { ProductCard } from '@/components/product-card';
import type { Product } from '@/lib/api/types';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

type SortKey = 'newest' | 'priceAsc' | 'priceDesc' | 'name';

function sortProducts(products: Product[], key: SortKey): Product[] {
  const copy = [...products];
  switch (key) {
    case 'priceAsc':
      return copy.sort((a, b) => a.effective_price - b.effective_price);
    case 'priceDesc':
      return copy.sort((a, b) => b.effective_price - a.effective_price);
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
    default:
      return copy;
  }
}

export function CatalogSort({
  products,
  locale,
  dict,
}: {
  products: Product[];
  locale: Locale;
  dict: Dictionary;
}) {
  const [sort, setSort] = useState<SortKey>('newest');
  const sorted = sortProducts(products, sort);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-3">
        <label
          htmlFor="catalog-sort"
          className="font-label text-[11px] uppercase tracking-widest text-muted"
        >
          {dict.catalog.sortLabel}
        </label>
        <select
          id="catalog-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-sm border border-border bg-surface px-3 py-2 font-body text-[13px] text-foreground outline-none"
        >
          <option value="newest">{dict.catalog.sortNewest}</option>
          <option value="priceAsc">{dict.catalog.sortPriceAsc}</option>
          <option value="priceDesc">{dict.catalog.sortPriceDesc}</option>
          <option value="name">{dict.catalog.sortName}</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        {sorted.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} dict={dict} />
        ))}
      </div>
    </div>
  );
}
