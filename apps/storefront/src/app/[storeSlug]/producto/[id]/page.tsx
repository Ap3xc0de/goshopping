'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useProduct, useCart } from '@goshopping/storefront-sdk';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { LoadingGrid } from '@/components/states';

export default function ProductPage() {
  const { storeSlug, id } = useParams<{ storeSlug: string; id: string }>();
  const { product, loading } = useProduct(storeSlug, id);
  const { addItem } = useCart(storeSlug);

  if (loading) return <LoadingGrid count={1} />;

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Producto no encontrado.</p>
        <Link href={`/${storeSlug}/catalogo`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al catálogo
          </Button>
        </Link>
      </div>
    );
  }

  const mainImage = product.images?.[0]?.url ?? '/placeholder.jpg';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link href={`/${storeSlug}/catalogo`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
          <Image src={mainImage} alt={product.name} fill className="object-cover" />
        </div>

        <div className="flex flex-col justify-center space-y-4">
          <h1 className="text-3xl font-heading font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold">
            ${product.price.toLocaleString('es-CO')}
          </p>
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}
          <Button
            size="lg"
            className="mt-4"
            onClick={() => addItem(product)}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  );
}
