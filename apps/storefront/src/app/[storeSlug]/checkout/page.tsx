'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart, useGoShopping, GoShoppingError } from '@goshopping/storefront-sdk';
import type { CreateOrderRequest } from '@goshopping/storefront-sdk';
import { Button } from '@/components/ui/button';
import { CheckoutForm, type CheckoutData, type CheckoutErrors } from '@/components/checkout/CheckoutForm';
import { CartSummary } from '@/components/cart/CartSummary';
import { toCartItemProps } from '@/lib/cart-adapter';

const EMPTY_FORM: CheckoutData = {
  name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  country: 'CO',
  notes: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_ERROR = 'No se pudo procesar tu pedido. Intenta de nuevo.';

// CHECKOUT-01: client-side validation with clear inline errors in Spanish.
// No react-hook-form/zod in apps/storefront's package.json — plain
// controlled state + a validate() function is the right-sized tool here.
function validate(data: CheckoutData): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (!data.name.trim()) errors.name = 'El nombre es obligatorio';
  if (!data.email.trim()) errors.email = 'El email es obligatorio';
  else if (!EMAIL_RE.test(data.email.trim())) errors.email = 'Ingresa un email válido';
  if (!data.phone.trim()) errors.phone = 'El teléfono es obligatorio';
  if (!data.street.trim()) errors.street = 'La dirección es obligatoria';
  if (!data.city.trim()) errors.city = 'La ciudad es obligatoria';
  if (!data.state.trim()) errors.state = 'El departamento es obligatorio';
  if (!data.zip.trim()) errors.zip = 'El código postal es obligatorio';
  return errors;
}

export default function CheckoutPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const router = useRouter();
  const { cart, clearCart } = useCart(storeSlug);
  const client = useGoShopping(storeSlug);

  const [data, setData] = useState<CheckoutData>(EMPTY_FORM);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (field: keyof CheckoutData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // CHECKOUT-02: guard the whole page — empty cart never renders the form.
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

  const handleSubmit = async () => {
    const nextErrors = validate(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    // CHECKOUT-03: flat DTO matching Go's CreateOrderInput (design decision
    // 5) — payment_method is fixed to "cash" (pago contra entrega / pendiente):
    // there is no online payment integration yet and Go does not validate
    // payment_method against a fixed list, so this reuses the same value
    // already exercised by apps/core's own tests/fixtures rather than
    // inventing a new one.
    const payload: CreateOrderRequest = {
      customer_name: data.name.trim(),
      customer_email: data.email.trim(),
      customer_phone: data.phone.trim(),
      items: cart.items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      payment_method: 'cash',
      shipping_address: {
        street: data.street.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        zip: data.zip.trim(),
        country: data.country.trim() || 'CO',
      },
      ...(data.notes.trim() ? { notes: data.notes.trim() } : {}),
    };

    try {
      const response = await client.createOrder(payload);
      clearCart();
      router.replace(
        `/${storeSlug}/pedido/${response.id}?token=${encodeURIComponent(response.access_token)}`,
      );
    } catch (error) {
      // CHECKOUT-04: keep the form filled and the cart intact — only surface
      // the error inline (StockError/4xx/network all extend GoShoppingError).
      if (error instanceof GoShoppingError) {
        setSubmitError(error.message || GENERIC_ERROR);
      } else {
        setSubmitError(GENERIC_ERROR);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const summaryItems = cart.items.map(toCartItemProps);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-heading font-bold mb-8">Checkout</h1>

      {submitError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      <CheckoutForm
        data={data}
        errors={errors}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isLoading={submitting}
        cartSummary={<CartSummary items={summaryItems} />}
      />
    </div>
  );
}
