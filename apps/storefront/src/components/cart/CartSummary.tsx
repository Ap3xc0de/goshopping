"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface CartSummaryItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartSummaryProps {
  items: CartSummaryItem[];
  discountCode?: string;
  discountAmount?: number;
  onApplyDiscount?: (code: string) => void;
}

export function CartSummary({
  items,
  discountCode,
  discountAmount = 0,
  onApplyDiscount,
}: CartSummaryProps) {
  const [code, setCode] = useState("");

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discounted = subtotal - discountAmount;
  const iva = discounted * 0.19;
  const total = discounted + iva;

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyDiscount?.(code);
  };

  return (
    <div className="bg-muted/30 rounded-lg p-6 space-y-4">
      <h3 className="font-semibold text-lg mb-4">Resumen del pedido</h3>

      {/* Items List */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3">
            <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} x {formatPrice(item.price)}
              </p>
            </div>
            <div className="text-sm font-medium">
              {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Discount Code */}
      {onApplyDiscount && (
        <form onSubmit={handleApplyDiscount} className="flex gap-2">
          <Input
            type="text"
            placeholder="Código de descuento"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!!discountCode}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={!!discountCode || !code}
          >
            Aplicar
          </Button>
        </form>
      )}

      {/* Summary */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600">
              Descuento {discountCode && `(${discountCode})`}
            </span>
            <span className="text-green-600">-{formatPrice(discountAmount)}</span>
          </div>
        )}

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
    </div>
  );
}
