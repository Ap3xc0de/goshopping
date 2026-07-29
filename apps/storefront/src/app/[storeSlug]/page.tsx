'use client';

import { useParams } from 'next/navigation';
import { useProducts, useStoreConfig } from '@goshopping/storefront-sdk';
import { HeroCentered } from '@/components/hero/HeroCentered';
import { ProductGrid } from '@/components/product/ProductGrid';
import { TrustBadges } from '@/components/marketing/TrustBadges';
import { NewsletterSignup } from '@/components/marketing/NewsletterSignup';
import type { ProductCardProps } from '@/components/product/ProductCard';

export default function StorefrontHomePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { config } = useStoreConfig(storeSlug);
  const { products, loading } = useProducts(storeSlug, { limit: 8 });

  const productCards: ProductCardProps[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.compare_at_price,
    image: p.images?.[0]?.url ?? '/placeholder.jpg',
    imageAlt: p.name,
    href: `/${storeSlug}/producto/${p.id}`,
  }));

  return (
    <>
      <HeroCentered
        title={config?.name ?? ''}
        subtitle={config?.tagline}
        ctaLabel="Ver catálogo"
        ctaHref={`/${storeSlug}/catalogo`}
        minHeight="80vh"
      />

      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="text-2xl font-heading font-bold mb-8 text-center">Productos destacados</h2>
        <ProductGrid products={productCards} loading={loading} columns={4} />
      </section>

      <TrustBadges />

      <NewsletterSignup variant="banner" />
    </>
  );
}
