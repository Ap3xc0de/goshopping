'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useProducts } from '@goshopping/storefront-sdk';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { ProductCardProps } from '@/components/product/ProductCard';

export default function CatalogPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [search, setSearch] = useState('');
  const { products, loading, setSearch: doSearch, total } = useProducts(storeSlug);

  const productCards: ProductCardProps[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.compare_at_price,
    image: p.images?.[0]?.url ?? '/placeholder.jpg',
    imageAlt: p.name,
    href: `/${storeSlug}/producto/${p.id}`,
  }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(search);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-heading font-bold mb-8">Catálogo</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar productos..."
        />
        <Button type="submit" size="icon" variant="outline">
          <Search className="w-4 h-4" />
        </Button>
      </form>

      <p className="text-sm text-muted-foreground mb-6">{total} productos encontrados</p>

      <ProductGrid products={productCards} loading={loading} columns={3} />
    </div>
  );
}
