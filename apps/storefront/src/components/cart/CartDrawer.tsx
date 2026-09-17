"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag } from "lucide-react";
import { CartItem, CartItemData } from "./CartItem";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItemData[];
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  /** CART-02: builds the "Ir a pagar" / catalog CTA hrefs for this store. */
  storeSlug: string;
}

export function CartDrawer({
  open,
  onClose,
  items,
  onQuantityChange,
  onRemove,
  storeSlug,
}: CartDrawerProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            Tu carrito ({items.length} {items.length === 1 ? "item" : "items"})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Agrega productos para comenzar tu compra
            </p>
            <Link href={`/${storeSlug}/catalogo`} onClick={onClose}>
              <Button>Ir al catálogo</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Items List */}
            <ScrollArea className="flex-1 px-6">
              <div className="py-4">
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    {...item}
                    onQuantityChange={onQuantityChange}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Footer with Summary */}
            <div className="border-t px-6 py-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA (19%)</span>
                  <span>{formatPrice(iva)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Link href={`/${storeSlug}/checkout`} onClick={onClose} className="block">
                <Button
                  size="lg"
                  className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
                >
                  Ir a pagar
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
