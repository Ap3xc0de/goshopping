import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n/dictionaries';

type Params = { locale: string; slug?: string[] };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);
  return { title: dict.comingSoon.title };
}

export default function ComingSoonPage({ params }: { params: Params }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <span className="font-label text-[11px] uppercase tracking-[0.24em] text-accent-bright">
        {dict.brand.label}
      </span>
      <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">
        {dict.comingSoon.title}
      </h1>
      <p className="mt-4 max-w-[40ch] font-body text-[15px] leading-relaxed text-muted">
        {dict.comingSoon.body}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-8 inline-flex items-center gap-2 rounded-sm bg-foreground px-6 py-3.5 font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground"
      >
        {dict.comingSoon.back}
      </Link>
    </div>
  );
}
