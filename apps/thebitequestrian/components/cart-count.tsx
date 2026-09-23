'use client';

import { useCart } from '@/lib/cart';

export function CartCount() {
  const { count } = useCart();
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-label text-[11px] font-semibold text-accent-foreground">
      {count}
    </span>
  );
}
