import Link from 'next/link';
import { getDictionary, defaultLocale } from '@/lib/i18n/dictionaries';

export default function NotFound() {
  const dict = getDictionary(defaultLocale);
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <span className="font-display text-7xl tracking-tight text-accent-bright">404</span>
      <h1 className="mt-4 font-display text-4xl tracking-tight">{dict.notFound.title}</h1>
      <p className="mt-4 max-w-[40ch] font-body text-[15px] leading-relaxed text-muted">
        {dict.notFound.message}
      </p>
      <Link
        href={`/${defaultLocale}`}
        className="mt-8 inline-flex items-center gap-2 rounded-sm bg-foreground px-6 py-3.5 font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground"
      >
        {dict.notFound.backHome}
      </Link>
    </div>
  );
}
