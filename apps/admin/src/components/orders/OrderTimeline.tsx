import { CheckCircle2, Clock, Package, Truck, XCircle, AlertCircle } from 'lucide-react';
import type { OrderTimelineEntry, OrderStatus } from '@/lib/types';
import { ORDER_STATUS_LABELS } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';

const statusIcon: Record<OrderStatus, React.ElementType> = {
  pending:   Clock,
  paid:      CheckCircle2,
  preparing: Package,
  shipped:   Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

interface OrderTimelineProps {
  timeline: OrderTimelineEntry[];
}

export function OrderTimeline({ timeline }: OrderTimelineProps) {
  return (
    <ol className="relative ml-4 border-l border-gray-200 space-y-6">
      {timeline.map((entry, i) => {
        const Icon = statusIcon[entry.status] ?? AlertCircle;
        const isLast = i === timeline.length - 1;
        return (
          <li key={i} className="ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-gray-200">
              <Icon className={`h-3.5 w-3.5 ${isLast ? 'text-brand-600' : 'text-gray-400'}`} />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {ORDER_STATUS_LABELS[entry.status]}
              </p>
              {entry.note && <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>}
              <div className="flex items-center gap-2 mt-1">
                {entry.changed_by_name && (
                  <span className="text-xs text-gray-400">{entry.changed_by_name}</span>
                )}
                {entry.changed_by_name && <span className="text-gray-300">·</span>}
                <span className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
