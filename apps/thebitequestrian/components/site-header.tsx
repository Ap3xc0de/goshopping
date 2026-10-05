import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import type { Category } from '@/lib/api/types';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { CartCount } from '@/components/cart-count';
import { SearchForm } from '@/components/search-form';

export function SiteHeader({
  locale,
  dict,
  categories,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: Category[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
        <Link href={`/${locale}`} className="flex flex-col leading-none">
          <span className="font-display text-2xl tracking-wide">THE BIT</span>
          <span className="mt-1 font-label text-[8.5px] uppercase tracking-[0.34em] text-muted">
            {dict.brand.label}
          </span>
        </Link>

        <nav className="ml-2 flex items-center gap-5 whitespace-nowrap">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${locale}/catalog?category=${cat.slug}`}
              className="border-b-2 border-transparent py-1.5 font-body text-[13px] font-medium tracking-wide transition-colors hover:border-accent-bright hover:text-accent-bright"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <SearchForm locale={locale} placeholder={dict.nav.searchPlaceholder} />

        <LocaleSwitcher locale={locale} />

        <Link
          href={`/${locale}/coming-soon/account`}
          className="whitespace-nowrap font-label text-xs uppercase tracking-widest text-foreground transition-colors hover:text-accent-bright"
        >
          {dict.nav.account}
        </Link>

        <ThemeToggle label={dict.theme.toggle} />

        <Link
          href={`/${locale}/cart`}
          className="flex items-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-background transition-colors hover:bg-accent-bright hover:text-foreground"
        >
          <span className="font-label text-xs uppercase tracking-widest">
            {dict.nav.cart}
          </span>
          <ShoppingBag className="h-4 w-4" />
          <CartCount />
        </Link>
      </div>
    </header>
  );
}
