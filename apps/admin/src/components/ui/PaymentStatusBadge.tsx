import type { Order } from '@/lib/types';
import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/utils';

interface PaymentStatusBadgeProps {
  status: Order['payment_status'];
}

/**
 * `payment_status` is optional on `Order` (predates existing mocks/fixtures)
 * and independent of the order `status` state machine (CORE-02). Renders
 * nothing when the field is absent rather than guessing a default.
 */
export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  if (!status) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[status]}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
