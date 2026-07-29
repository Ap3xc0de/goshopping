'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
  durationMs?: number;
}

export function Toast({ message, type = 'success', onClose, durationMs = 3500 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onClose]);

  const bg = type === 'error' ? 'bg-red-600' : 'bg-brand-700';
  const Icon = type === 'error' ? XCircle : CheckCircle2;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl ${bg} px-4 py-3 text-sm text-white shadow-lg`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Cerrar" className="ml-1 p-0.5 hover:opacity-75">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
