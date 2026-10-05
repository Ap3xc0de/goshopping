import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Bodoni_Moda, Archivo, Archivo_Narrow } from 'next/font/google';
import '@/app/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AnnouncementBar } from '@/components/announcement-bar';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { getDictionary, isLocale, locales, type Locale } from '@/lib/i18n/dictionaries';
import { getCategoryTree, previewBanner } from '@/lib/api/client';
import { siteUrl, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';

const bodoniModa = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-display',
  display: 'swap',
  adjustFontFallback: false,
});

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const archivoNarrow = Archivo_Narrow({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-label',
  display: 'swap',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  const locale = params.locale;
  const dict = getDictionary(isLocale(locale) ? locale : 'es');
  const brand = `${dict.brand.name} ${dict.brand.label}`;
  const url = siteUrl();
  return {
    metadataBase: new URL(url),
    title: {
      default: `${brand} — ${dict.brand.tagline}`,
      template: `%s — ${brand}`,
    },
    description: dict.brand.blurb,
    alternates: {
      languages: {
        es: '/es',
        en: '/en',
      },
    },
    openGraph: {
      type: 'website',
      siteName: brand,
      title: brand,
      description: dict.brand.blurb,
      images: [{ url: `${url}/og.png` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: brand,
      description: dict.brand.blurb,
      images: [`${url}/og.png`],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'es';
  const dict = getDictionary(locale);
  const categories = await getCategoryTree();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${bodoniModa.variable} ${archivo.variable} ${archivoNarrow.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AnnouncementBar dict={dict} />
          {previewBanner() && (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-1.5 text-center font-label text-[11px] uppercase tracking-widest text-amber-400">
              {dict.preview.banner}
            </div>
          )}
          <SiteHeader locale={locale} dict={dict} categories={categories} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} dict={dict} />
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }}
        />
      </body>
    </html>
  );
}
