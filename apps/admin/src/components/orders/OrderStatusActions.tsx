'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useOrderActions } from '@/lib/hooks/useOrders';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import {
  ORDER_NEXT_STATUS,
  ORDER_NEXT_ACTION_LABEL,
  ORDER_STATUS_LABELS,
} from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/types';

interface OrderStatusActionsProps {
  order: Order;
  storeId: string;
  onUpdated: () => void;
}

export function OrderStatusActions({ order, storeId, onUpdated }: OrderStatusActionsProps) {
  const { updateStatus, cancel, loading } = useOrderActions();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [trackingModal, setTrackingModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [tracking, setTracking] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [advanceConfirm, setAdvanceConfirm] = useState(false);

  const nextStatus = ORDER_NEXT_STATUS[order.status];
  const nextLabel = nextStatus ? ORDER_NEXT_ACTION_LABEL[order.status] : null;

  async function handleAdvance() {
    if (!nextStatus) return;
    if (nextStatus === 'shipped') {
      setTrackingModal(true);
      return;
    }
    setAdvanceConfirm(true);
  }

  async function confirmAdvance() {
    setAdvanceConfirm(false);
    if (!nextStatus) return;
    const err = await updateStatus(storeId, order.id, nextStatus);
    if (err) {
      setToast({ message: err, type: 'error' });
    } else {
      setToast({ message: `Pedido marcado como ${ORDER_STATUS_LABELS[nextStatus]}`, type: 'success' });
      onUpdated();
    }
  }

  async function handleShip() {
    setTrackingModal(false);
    const err = await updateStatus(storeId, order.id, 'shipped', undefined, tracking || undefined);
    if (err) {
      setToast({ message: err, type: 'error' });
    } else {
      setToast({ message: 'Pedido marcado como Enviado', type: 'success' });
      onUpdated();
    }
  }

  async function handleCancel() {
    setCancelModal(false);
    const err = await cancel(storeId, order.id, cancelReason || 'Cancelado por el vendedor');
    if (err) {
      setToast({ message: err, type: 'error' });
    } else {
      setToast({ message: 'Pedido cancelado', type: 'success' });
      onUpdated();
    }
  }

  const canCancel = !['cancelled', 'delivered'].includes(order.status);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {nextLabel && nextStatus && (
          <button
            onClick={handleAdvance}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {nextLabel} <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setCancelModal(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Cancelar pedido
          </button>
        )}
      </div>

      {/* Advance confirm */}
      <ConfirmDialog
        open={advanceConfirm}
        title="Cambiar estado"
        message={`¿Marcar este pedido como "${nextStatus ? ORDER_STATUS_LABELS[nextStatus] : ''}"?`}
        confirmLabel="Confirmar"
        onConfirm={confirmAdvance}
        onCancel={() => setAdvanceConfirm(false)}
      />

      {/* Shipping modal */}
      <Modal open={trackingModal} onClose={() => setTrackingModal(false)} title="Enviar pedido" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de guía / tracking <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="TRK-12345678"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setTrackingModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleShip} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Confirmar envío</button>
          </div>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Cancelar pedido" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de cancelación</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: Cliente solicitó cancelación..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setCancelModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Volver</button>
            <button onClick={handleCancel} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Cancelar pedido</button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
