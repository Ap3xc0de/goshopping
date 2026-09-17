import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";

/**
 * Data shape rendered by a cart line — deliberately split from
 * `CartItemProps` (design decision 12's adapter target) so
 * `CartDrawer.items` can hold plain data without also forcing every mapped
 * item to carry its own (unused, always-overridden) callbacks.
 */
export interface CartItemData {
  id: string;
  name: string;
  variant?: string;
  image: string;
  price: number;
  quantity: number;
  /** CART-03: available stock for this product, when known — caps the "+" stepper. */
  stock?: number;
}

export interface CartItemProps extends CartItemData {
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({
  id,
  name,
  variant,
  image,
  price,
  quantity,
  stock,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalPrice = price * quantity;
  const atMaxStock = stock !== undefined && quantity >= stock;

  return (
    <div className="flex gap-4 py-4 border-b last:border-b-0">
      {/* Image */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-sm">{name}</h3>
            {variant && (
              <p className="text-xs text-muted-foreground mt-1">{variant}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label="Eliminar"
            onClick={() => onRemove(id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-auto">
          {/* Quantity Controls */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Disminuir cantidad"
                onClick={() => onQuantityChange(id, quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Aumentar cantidad"
                onClick={() => onQuantityChange(id, quantity + 1)}
                disabled={atMaxStock}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {atMaxStock && (
              <p className="text-xs text-muted-foreground">Stock máximo alcanzado</p>
            )}
          </div>

          {/* Price */}
          <div className="font-bold text-sm">
            {formatPrice(totalPrice)}
          </div>
        </div>
      </div>
    </div>
  );
}
