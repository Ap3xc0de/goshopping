'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useStoreConfig } from '@goshopping/storefront-sdk';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { config } = useStoreConfig(storeSlug);

  // Apply CSS variables from store config to the document root
  useEffect(() => {
    if (!config?.colors) return;
    const root = document.documentElement;
    if (config.colors.primary) root.style.setProperty('--brand-primary', config.colors.primary);
    if (config.colors.secondary)
      root.style.setProperty('--brand-secondary', config.colors.secondary);
    if (config.colors.accent) root.style.setProperty('--brand-accent', config.colors.accent);
  }, [config]);

  const navLinks = [
    { label: 'Inicio', href: `/${storeSlug}` },
    { label: 'Catálogo', href: `/${storeSlug}/catalogo` },
  ];

  return (
    <>
      <Navbar
        logo={{ text: config?.name ?? storeSlug, href: `/${storeSlug}` }}
        links={navLinks}
        variant="solid"
      />
      <main>{children}</main>
      <Footer storeName={config?.name ?? storeSlug} />
    </>
  );
}
