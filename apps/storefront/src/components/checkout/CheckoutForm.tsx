"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// CHECKOUT-01: guest checkout only needs a single "nombre" field (not
// first/last) — this is a deliberate simplification versus the original
// orphan CheckoutForm, matching the flat `customer_name` the Go DTO expects
// (design decision 5). Payment method is fixed to "pago pendiente" at the
// page level (no online payment integration yet), so it's not a form field.
export interface CheckoutData {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  notes: string;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutData, string>>;

interface CheckoutFormProps {
  data: CheckoutData;
  errors?: CheckoutErrors;
  onChange: (field: keyof CheckoutData, value: string) => void;
  onSubmit: (e: React.FormEvent | React.MouseEvent) => void;
  isLoading?: boolean;
  cartSummary?: React.ReactNode;
}

export function CheckoutForm({
  data,
  errors = {},
  onChange,
  onSubmit,
  isLoading = false,
  cartSummary,
}: CheckoutFormProps) {
  const handleInput =
    (field: keyof CheckoutData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field, e.target.value);

  const fieldError = (field: keyof CheckoutData) =>
    errors[field] ? (
      <p className="text-sm text-destructive mt-1">{errors[field]}</p>
    ) : null;

  const handleSubmit = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="lg:col-span-7 space-y-8">
        {/* Contact Information */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Datos de contacto</h2>
          <div>
            <Label htmlFor="name">Nombre completo *</Label>
            <Input id="name" name="name" value={data.name} onChange={handleInput("name")} />
            {fieldError("name")}
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={data.email}
              onChange={handleInput("email")}
            />
            {fieldError("email")}
          </div>
          <div>
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={data.phone}
              onChange={handleInput("phone")}
            />
            {fieldError("phone")}
          </div>
        </div>

        <Separator />

        {/* Shipping Address */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Dirección de envío</h2>
          <div>
            <Label htmlFor="street">Dirección *</Label>
            <Input
              id="street"
              name="street"
              value={data.street}
              onChange={handleInput("street")}
              placeholder="Calle, número, apartamento, etc."
            />
            {fieldError("street")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Ciudad *</Label>
              <Input id="city" name="city" value={data.city} onChange={handleInput("city")} />
              {fieldError("city")}
            </div>
            <div>
              <Label htmlFor="state">Departamento *</Label>
              <Input id="state" name="state" value={data.state} onChange={handleInput("state")} />
              {fieldError("state")}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="zip">Código postal *</Label>
              <Input id="zip" name="zip" value={data.zip} onChange={handleInput("zip")} />
              {fieldError("zip")}
            </div>
            <div>
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                name="country"
                value={data.country}
                onChange={handleInput("country")}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Order Notes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Notas del pedido</h2>
          <div>
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              value={data.notes}
              onChange={handleInput("notes")}
              placeholder="Instrucciones especiales de entrega, referencias, etc."
              rows={4}
            />
          </div>
        </div>

        {/* Submit Button - Mobile */}
        <div className="lg:hidden">
          <Button
            type="submit"
            size="lg"
            className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Procesando..." : "Pagar ahora"}
          </Button>
        </div>
      </form>

      {/* Summary Sidebar */}
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24 space-y-6">
          {cartSummary}
          {/* Submit Button - Desktop (outside <form>, needs its own handler) */}
          <div className="hidden lg:block">
            <Button
              type="button"
              size="lg"
              className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
              disabled={isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? "Procesando..." : "Pagar ahora"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
