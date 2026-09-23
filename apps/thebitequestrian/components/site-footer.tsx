import Link from 'next/link';
import { Instagram } from 'lucide-react';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { NewsletterForm } from '@/components/newsletter-form';

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const browsePairs = dict.nav.browseLinks.map((link, i) => ({
    label: link,
    href: `/${locale}${dict.footer.browseHrefs[i] ?? ''}`,
  }));

  const shopPairs = dict.footer.shopLinks.map((link, i) => ({
    label: link,
    href: `/${locale}${dict.footer.shopHrefs[i] ?? ''}`,
  }));

  return (
    <footer className="mt-12 bg-surface text-muted">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col gap-3">
          <span className="font-display text-2xl text-foreground">
            THE BIT <span className="text-accent-bright">EQUESTRIAN</span>
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.3em] text-accent-bright">
            {dict.brand.tagline}
          </span>
          <p className="max-w-[30ch] font-body text-[13px] leading-relaxed">
            {dict.brand.blurb}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-label text-[10px] uppercase tracking-[0.24em] text-accent-bright">
            {dict.nav.browse}
          </span>
          {browsePairs.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="w-fit font-body text-[13px] leading-relaxed transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-label text-[10px] uppercase tracking-[0.24em] text-accent-bright">
            {dict.footer.shopTitle}
          </span>
          {shopPairs.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="w-fit font-body text-[13px] leading-relaxed transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <span className="font-label text-[10px] uppercase tracking-[0.24em] text-accent-bright">
            {dict.footer.communityTitle}
          </span>
          <a
            href={dict.footer.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-2 font-body text-[13px] leading-relaxed transition-colors hover:text-foreground"
          >
            <Instagram className="h-4 w-4" />
            {dict.footer.instagram}
          </a>
          <div className="flex flex-col gap-1">
            <span className="font-body text-[13px] leading-relaxed text-foreground">
              {dict.footer.wholesaleLabel}
            </span>
            <a
              href={`tel:${dict.footer.wholesalePhone.replace(/\s/g, '')}`}
              className="w-fit font-label text-sm uppercase tracking-widest text-accent-bright transition-colors hover:text-foreground"
            >
              {dict.footer.wholesalePhone}
            </a>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <span className="font-label text-[10px] uppercase tracking-[0.24em] text-accent-bright">
              {dict.footer.subscribeTitle}
            </span>
            <p className="font-body text-[13px] leading-relaxed">
              {dict.footer.subscribeBody}
            </p>
            <NewsletterForm dict={dict} />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 py-5 font-body text-xs text-muted md:flex-row md:items-center">
          <span>
            Copyright © {new Date().getFullYear()} {dict.brand.fullName} —{' '}
            {dict.footer.rights}
          </span>
          <span className="flex items-center gap-6">
            <Link
              href={`/${locale}/coming-soon/terms-and-conditions`}
              className="transition-colors hover:text-foreground"
            >
              {dict.footer.terms}
            </Link>
            <Link
              href={`/${locale}/coming-soon/privacy-policy`}
              className="transition-colors hover:text-foreground"
            >
              {dict.footer.privacy}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
