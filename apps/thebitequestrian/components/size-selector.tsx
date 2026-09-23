'use client';

import type { Dictionary } from '@/lib/i18n/dictionaries';

export function SizeSelector({
  sizes,
  value,
  onChange,
  dict,
}: {
  sizes: readonly string[];
  value: string;
  onChange: (size: string) => void;
  dict: Dictionary;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-label text-[11px] uppercase tracking-widest text-muted">
          {dict.product.size}
        </span>
        <span className="font-label text-[11px] uppercase tracking-widest text-accent-bright">
          {dict.product.sizeGuide}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const active = size === value;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onChange(size)}
              aria-pressed={active}
              className={
                active
                  ? 'min-w-[44px] rounded-sm border border-foreground bg-foreground px-3 py-2 font-label text-xs uppercase tracking-widest text-background'
                  : 'min-w-[44px] rounded-sm border border-border px-3 py-2 font-label text-xs uppercase tracking-widest text-foreground transition-colors hover:border-foreground'
              }
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
