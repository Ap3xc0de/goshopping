"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface CheckoutSuccessItem {
  name: string;
  quantity: number;
  price: number;
}

interface CheckoutSuccessProps {
  orderNumber: string;
  items: CheckoutSuccessItem[];
  total: number;
  onContinueShopping: () => void;
}

export function CheckoutSuccess({
  orderNumber,
  items,
  total,
  onContinueShopping,
}: CheckoutSuccessProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="flex justify-center mb-6"
      >
        <div className="rounded-full bg-green-100 p-6">
          <CheckCircle2 className="w-16 h-16 text-green-600" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          ¡Pedido confirmado!
        </h1>
        <p className="text-lg text-muted-foreground">
          Pedido #{orderNumber}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Recibirás un email de confirmación con los detalles de tu pedido
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="bg-muted/30 rounded-lg p-6 mb-8"
      >
        <h2 className="font-semibold text-lg mb-4">Resumen del pedido</h2>

        <div className="space-y-3 mb-4">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span className="font-medium">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Button
          size="lg"
          className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
          onClick={onContinueShopping}
        >
          Seguir comprando
        </Button>
        <Button size="lg" variant="outline">
          Ver mis pedidos
        </Button>
      </motion.div>
    </div>
  );
}
