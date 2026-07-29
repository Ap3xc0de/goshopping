'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useCart } from '@goshopping/storefront-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';

export default function CheckoutPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { cart, removeItem, updateQuantity } = useCart(storeSlug);
  const [email, setEmail] = useState('');

  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-heading font-bold mb-2">Tu carrito está vacío</h1>
        <p className="text-muted-foreground mb-6">Agrega productos para continuar.</p>
        <Link href={`/${storeSlug}/catalogo`}>
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ir al catálogo
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-heading font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cart items */}
        <div className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex gap-4 p-4 border rounded-xl">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <Image
                  src={item.image ?? '/placeholder.jpg'}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">${item.price.toLocaleString('es-CO')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                    className="w-16 h-7 text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => removeItem(item.productId)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="bg-muted/50 rounded-xl p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-lg">Resumen del pedido</h2>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${total.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-4">
            <span>Total</span>
            <span>${total.toLocaleString('es-CO')}</span>
          </div>
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button className="w-full" size="lg" disabled={!email}>
            Pagar ahora
          </Button>
        </div>
      </div>
    </div>
  );
}
