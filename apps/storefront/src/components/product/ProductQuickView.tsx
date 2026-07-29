"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ProductQuickViewProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    description?: string;
  };
  open: boolean;
  onClose: () => void;
  onAddToCart?: (id: string) => void;
}

export function ProductQuickView({
  product,
  open,
  onClose,
  onAddToCart,
}: ProductQuickViewProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div>
            <AspectRatio ratio={3 / 4}>
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover rounded-lg"
              />
            </AspectRatio>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="text-3xl font-bold mb-4">
              {formatPrice(product.price)}
            </div>

            {product.description && (
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {product.description}
              </p>
            )}

            <div className="mt-auto space-y-3">
              <Button
                size="lg"
                className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
                onClick={() => {
                  onAddToCart?.(product.id);
                  onClose();
                }}
              >
                Agregar al carrito
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full"
              >
                <Link href={`/products/${product.id}`}>
                  Ver detalle completo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
