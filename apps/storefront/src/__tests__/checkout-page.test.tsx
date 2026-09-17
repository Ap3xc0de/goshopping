/**
 * @jest-environment jsdom
 *
 * CHECKOUT-01..05: guest checkout page.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ storeSlug: 'tienda-test' }),
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

const mockClearCart = jest.fn();
const mockCreateOrder = jest.fn();

// Spreads the real module so error classes (GoShoppingError, etc.) stay the
// actual production classes — same pattern as storeSlugRoutes.test.tsx.
jest.mock('@goshopping/storefront-sdk', () => ({
  ...jest.requireActual('@goshopping/storefront-sdk'),
  useCart: jest.fn(),
  useGoShopping: jest.fn(),
}));

import { useCart, useGoShopping, GoShoppingError } from '@goshopping/storefront-sdk';
import CheckoutPage from '@/app/[storeSlug]/checkout/page';

const PRODUCT_A = {
  id: 'prod-a',
  name: 'Camiseta',
  sku: 'sku-a',
  description: '',
  price: 50000,
  stock: 10,
  category: 'ropa',
  images: [],
  status: 'active' as const,
};

function cartWith(items: Array<{ product: typeof PRODUCT_A; quantity: number }>) {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  return {
    items,
    subtotal,
    tax: 0,
    total: subtotal,
    itemCount,
  };
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Juana Pérez' } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'juana@test.com' } });
  fireEvent.change(screen.getByLabelText(/teléfono|telefono/i), { target: { value: '3001234567' } });
  fireEvent.change(screen.getByLabelText(/^dirección/i), { target: { value: 'Calle 123' } });
  fireEvent.change(screen.getByLabelText(/ciudad/i), { target: { value: 'Bogotá' } });
  fireEvent.change(screen.getByLabelText(/departamento/i), { target: { value: 'Cundinamarca' } });
  fireEvent.change(screen.getByLabelText(/código postal/i), { target: { value: '110111' } });
}

function submitForm() {
  const form = screen.getAllByRole('button', { name: /pagar/i })[0].closest('form')!;
  fireEvent.submit(form);
}

describe('[storeSlug]/checkout CheckoutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCart as jest.Mock).mockReturnValue({
      cart: cartWith([{ product: PRODUCT_A, quantity: 2 }]),
      clearCart: mockClearCart,
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
    });
    (useGoShopping as jest.Mock).mockReturnValue({
      createOrder: mockCreateOrder,
      getOrderStatus: jest.fn(),
    });
  });

  it('CHECKOUT-02: renders an empty state and no form when the cart is empty', () => {
    (useCart as jest.Mock).mockReturnValue({
      cart: cartWith([]),
      clearCart: mockClearCart,
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
    });

    render(<CheckoutPage />);

    expect(screen.getByText(/carrito está vacío/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre completo/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /catálogo/i })).toHaveAttribute(
      'href',
      '/tienda-test/catalogo',
    );
  });

  it('CHECKOUT-01: blocks submit and shows inline errors when required fields are missing', async () => {
    render(<CheckoutPage />);

    submitForm();

    await waitFor(() => {
      expect(screen.getByText(/el nombre es obligatorio/i)).toBeInTheDocument();
    });
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('CHECKOUT-03: submits the exact flat DTO to createOrder and redirects on success', async () => {
    mockCreateOrder.mockResolvedValue({
      id: 'order-123',
      order_number: 'ORD-001',
      status: 'pending',
      payment_status: 'pending',
      total: 100000,
      subtotal: 100000,
      tax: 0,
      items: [],
      access_token: 'tok-abc',
    });

    render(<CheckoutPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nombre completo/i), 'Juana Pérez');
    await user.type(screen.getByLabelText(/^email/i), 'juana@test.com');
    await user.type(screen.getByLabelText(/teléfono|telefono/i), '3001234567');
    await user.type(screen.getByLabelText(/^dirección/i), 'Calle 123');
    await user.type(screen.getByLabelText(/ciudad/i), 'Bogotá');
    await user.type(screen.getByLabelText(/departamento/i), 'Cundinamarca');
    await user.type(screen.getByLabelText(/código postal/i), '110111');

    submitForm();

    await waitFor(() => expect(mockCreateOrder).toHaveBeenCalledTimes(1));

    expect(mockCreateOrder).toHaveBeenCalledWith({
      customer_name: 'Juana Pérez',
      customer_email: 'juana@test.com',
      customer_phone: '3001234567',
      items: [{ product_id: 'prod-a', quantity: 2 }],
      payment_method: 'cash',
      shipping_address: {
        street: 'Calle 123',
        city: 'Bogotá',
        state: 'Cundinamarca',
        zip: '110111',
        country: 'CO',
      },
    });

    await waitFor(() => expect(mockClearCart).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/tienda-test/pedido/order-123?token=tok-abc'),
    );
  });

  it('CHECKOUT-04: shows the error message and keeps the cart/data on failure', async () => {
    mockCreateOrder.mockRejectedValue(new GoShoppingError(409, 'Stock insuficiente', 'INSUFFICIENT_STOCK'));

    render(<CheckoutPage />);
    fillValidForm();
    submitForm();

    await waitFor(() => {
      expect(screen.getByText(/stock insuficiente/i)).toBeInTheDocument();
    });

    expect(mockClearCart).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    // Data is preserved
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue('Juana Pérez');
  });
});
