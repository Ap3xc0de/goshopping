'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useOrderStatus, GoShoppingError } from '@goshopping/storefront-sdk';
import { Button } from '@/components/ui/button';
import { CheckoutSuccess } from '@/components/checkout/CheckoutSuccess';

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  preparing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pago pendiente',
  paid: 'Pagado',
  failed: 'Pago fallido',
  refunded: 'Reembolsado',
};

const PAYMENT_PENDING_NOTE =
  'Nos pondremos en contacto contigo para coordinar el pago. Muy pronto habilitaremos pagos en línea.';

function FriendlyErrorState({ storeSlug }: { storeSlug: string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h1 className="text-2xl font-heading font-bold mb-2">No pudimos encontrar tu pedido</h1>
      <p className="text-muted-foreground mb-6">
        El enlace no es válido o ya expiró. Si acabas de completar una compra, revisa tu email de
        confirmación.
      </p>
      <Link href={`/${storeSlug}/catalogo`}>
        <Button>Ir al catálogo</Button>
      </Link>
    </div>
  );
}

// CHECKOUT-06: reads ?token= and shows order/payment status via getOrderStatus
// (wrapped by useOrderStatus, already fixed in Slice 2 to send ?token=).
export default function OrderConfirmationPage() {
  const { storeSlug, orderId } = useParams<{ storeSlug: string; orderId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { status, loading, error } = useOrderStatus(storeSlug, orderId, token);

  if (!token) {
    return <FriendlyErrorState storeSlug={storeSlug} />;
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center text-muted-foreground">
        Cargando tu pedido...
      </div>
    );
  }

  // Any error (401 unauthorized token, 404, network) gets the same friendly
  // message — we never leak raw API error text on this page.
  if (error || !status) {
    return <FriendlyErrorState storeSlug={storeSlug} />;
  }

  const shippingAddress = status.shipping_address
    ? {
        street: status.shipping_address.street,
        city: status.shipping_address.city,
        state: status.shipping_address.state,
        zip: status.shipping_address.zip,
        country: status.shipping_address.country,
      }
    : undefined;

  return (
    <CheckoutSuccess
      orderNumber={status.order_number}
      items={status.items.map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
      }))}
      total={status.total}
      orderStatus={ORDER_STATUS_LABELS[status.status] ?? status.status}
      paymentStatus={PAYMENT_STATUS_LABELS[status.payment_status] ?? status.payment_status}
      paymentStatusNote={status.payment_status === 'pending' ? PAYMENT_PENDING_NOTE : undefined}
      shippingAddress={shippingAddress}
      continueShoppingHref={`/${storeSlug}/catalogo`}
    />
  );
}
