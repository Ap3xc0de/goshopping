'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useProduct, useCart } from '@goshopping/storefront-sdk';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowLeft, Minus, Plus } from 'lucide-react';
import { LoadingGrid } from '@/components/states';
import { productImage } from '@/lib/product-image';
import { addToCartWithFeedback } from '@/lib/add-to-cart-feedback';

export default function ProductPage() {
  const { storeSlug, id } = useParams<{ storeSlug: string; id: string }>();
  const { product, loading } = useProduct(storeSlug, id);
  const { addItem } = useCart(storeSlug);
  const [quantity, setQuantity] = useState(1);

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

  const mainImage = productImage(product);
  // PRODUCT-02/03: `stock` may be absent on legacy/mocked product shapes —
  // treat that as "no cap" rather than crashing or silently disabling.
  const outOfStock = product.stock === 0;
  const atMaxStock = product.stock !== undefined && quantity >= product.stock;

  const decrement = () => setQuantity((q) => Math.max(1, q - 1));
  const increment = () =>
    setQuantity((q) => (product.stock !== undefined && q >= product.stock ? q : q + 1));

  const handleAddToCart = () => {
    addToCartWithFeedback(addItem, product, quantity);
    setQuantity(1);
  };

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

          {/* PRODUCT-01/02: quantity selector, capped at product.stock */}
          {!outOfStock && (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Disminuir cantidad"
                onClick={decrement}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Aumentar cantidad"
                onClick={increment}
                disabled={atMaxStock}
              >
                <Plus className="w-4 h-4" />
              </Button>
              {atMaxStock && (
                <span className="text-sm text-muted-foreground">Stock máximo alcanzado</span>
              )}
            </div>
          )}

          {/* PRODUCT-03: disabled "Sin stock" state when stock is 0 */}
          <Button
            size="lg"
            className="mt-4"
            onClick={handleAddToCart}
            disabled={outOfStock}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
          </Button>
        </div>
      </div>
    </div>
  );
}
