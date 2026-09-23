'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n/dictionaries';

function pathForLocale(pathname: string, target: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  const current = segments[0];
  if (locales.includes(current as Locale)) {
    segments[0] = target;
  } else {
    segments.unshift(target);
  }
  return `/${segments.join('/')}` || `/${target}`;
}

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 font-label uppercase tracking-widest">
      {locales.map((l) => {
        const href = pathForLocale(pathname, l);
        const active = l === locale;
        return (
          <Link
            key={l}
            href={href}
            aria-current={active ? 'true' : undefined}
            className={
              active
                ? 'px-1 text-foreground underline underline-offset-4 decoration-accent-bright decoration-2'
                : 'px-1 text-muted transition-colors hover:text-foreground'
            }
          >
            {l}
          </Link>
        );
      })}
    </div>
  );
}
