"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Landmark, Wallet } from "lucide-react";

export interface CheckoutData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  postalCode: string;
  paymentMethod: "credit_card" | "pse" | "cash_on_delivery";
  notes?: string;
}

interface CheckoutFormProps {
  onSubmit: (data: CheckoutData) => void;
  isLoading?: boolean;
  cartSummary?: React.ReactNode;
}

export function CheckoutForm({
  onSubmit,
  isLoading = false,
  cartSummary,
}: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    department: "",
    postalCode: "",
    paymentMethod: "credit_card",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 space-y-8"
      >
        {/* Contact Information */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Datos de contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <Separator />

        {/* Shipping Address */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Dirección de envío</h2>
          <div>
            <Label htmlFor="address">Dirección *</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Calle, número, apartamento, etc."
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="department">Departamento *</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="postalCode">Código Postal *</Label>
            <Input
              id="postalCode"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <Separator />

        {/* Payment Method */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Método de pago</h2>
          <RadioGroup
            value={formData.paymentMethod}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                paymentMethod: value as CheckoutData["paymentMethod"],
              }))
            }
          >
            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="credit_card" id="credit_card" />
              <Label
                htmlFor="credit_card"
                className="flex items-center gap-3 cursor-pointer flex-1"
              >
                <CreditCard className="w-5 h-5" />
                <span>Tarjeta de crédito</span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="pse" id="pse" />
              <Label
                htmlFor="pse"
                className="flex items-center gap-3 cursor-pointer flex-1"
              >
                <Landmark className="w-5 h-5" />
                <span>PSE (Débito bancario)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="cash_on_delivery" id="cash_on_delivery" />
              <Label
                htmlFor="cash_on_delivery"
                className="flex items-center gap-3 cursor-pointer flex-1"
              >
                <Wallet className="w-5 h-5" />
                <span>Pago contra entrega</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Order Notes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Notas del pedido</h2>
          <div>
            <Label htmlFor="notes">
              Notas adicionales (opcional)
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
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
            {isLoading ? "Procesando..." : "Finalizar compra"}
          </Button>
        </div>
      </form>

      {/* Summary Sidebar */}
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24 space-y-6">
          {cartSummary}
          {/* Submit Button - Desktop */}
          <div className="hidden lg:block">
            <Button
              type="submit"
              size="lg"
              className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
              disabled={isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? "Procesando..." : "Finalizar compra"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
