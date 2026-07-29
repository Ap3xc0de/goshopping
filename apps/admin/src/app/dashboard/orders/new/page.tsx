'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Plus, Minus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/hooks/useStore';
import { useOrderActions } from '@/lib/hooks/useOrders';
import { useProducts } from '@/lib/hooks/useProducts';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { SearchInput } from '@/components/ui/SearchInput';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency, calculateTax } from '@/lib/utils';
import type { Product, Customer } from '@/lib/types';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { storeId } = useStore();
  const { create, loading } = useOrderActions();

  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<import('@/lib/types').PaymentMethod>('cash');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: customersData } = useCustomers({ search: customerSearch || undefined, per_page: 5 });
  const { data: productsData } = useProducts({ search: productSearch || undefined, per_page: 10 });

  const customers = customersData?.data ?? [];
  const products = productsData?.data ?? [];

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setProductSearch('');
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  async function handleSubmit() {
    if (!storeId || !selectedCustomer || cart.length === 0) return;

    const orderData = {
      customer_id: selectedCustomer.id,
      items: cart.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: i.product.price,
          total: i.product.price * i.quantity,
        })),
      notes: notes || undefined,
      payment_method: paymentMethod,
    };

    const err = await create(storeId, orderData);
    if (err) {
      setToast({ message: err, type: 'error' });
    } else {
      setToast({ message: 'Pedido creado exitosamente', type: 'success' });
      setTimeout(() => router.push('/dashboard/orders'), 1200);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nuevo pedido</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: customer + products */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Cliente</h2>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-brand-50 border border-brand-200">
                <div>
                  <p className="text-sm font-medium text-gray-800">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-500">{selectedCustomer.email}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-sm text-red-500 hover:text-red-700">Cambiar</button>
              </div>
            ) : (
              <div>
                <SearchInput placeholder="Buscar cliente por nombre o email…" value={customerSearch} onChange={setCustomerSearch} />
                {customers.length > 0 && customerSearch && (
                  <ul className="mt-2 border border-gray-200 rounded-lg divide-y">
                    {customers.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
                        >
                          <span className="font-medium text-gray-800">{c.name}</span>
                          <span className="text-gray-400 ml-2">{c.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Products */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Productos</h2>
            <SearchInput placeholder="Buscar producto…" value={productSearch} onChange={setProductSearch} />
            {products.length > 0 && productSearch && (
              <ul className="mt-2 border border-gray-200 rounded-lg divide-y">
                {products.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => addToCart(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium text-gray-800">{p.name}</span>
                        {p.sku && <span className="text-gray-400 ml-2 text-xs">{p.sku}</span>}
                      </div>
                      <span className="text-brand-700 font-semibold">{formatCurrency(p.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {cart.length > 0 && (
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Producto', 'Precio', 'Cantidad', 'Subtotal', ''].map((h) => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cart.map((item) => (
                    <tr key={item.product.id}>
                      <td className="py-2.5 font-medium text-gray-800 pr-2">{item.product.name}</td>
                      <td className="py-2.5 text-gray-600 whitespace-nowrap">{formatCurrency(item.product.price)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.product.id, -1)} className="p-0.5 rounded hover:bg-gray-100"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => updateQty(item.product.id, 1)} className="p-0.5 rounded hover:bg-gray-100"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                      <td className="py-2.5 font-medium text-gray-900 whitespace-nowrap">{formatCurrency(item.product.price * item.quantity)}</td>
                      <td className="py-2.5">
                        <button onClick={() => removeItem(item.product.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Notas del pedido</h2>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, dirección adicional…"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm sticky top-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Resumen del pedido</h2>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA (19%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Método de pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as import('@/lib/types').PaymentMethod)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !selectedCustomer || cart.length === 0}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {loading ? 'Creando…' : 'Crear pedido'}
            </button>

            {!selectedCustomer && (
              <p className="text-xs text-gray-400 text-center mt-2">Selecciona un cliente primero</p>
            )}
            {cart.length === 0 && selectedCustomer && (
              <p className="text-xs text-gray-400 text-center mt-2">Agrega al menos un producto</p>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
