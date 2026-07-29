/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

describe('CheckoutForm', () => {
  it('renders all required form sections', () => {
    render(<CheckoutForm onSubmit={jest.fn()} />);
    expect(screen.getByText(/datos de contacto/i)).toBeInTheDocument();
    // "Dirección" appears as both a section heading and field label
    expect(screen.getAllByText(/direcci[oó]n/i).length).toBeGreaterThan(0);
    // "Pago" appears in section heading and payment options
    expect(screen.getAllByText(/pago/i).length).toBeGreaterThan(0);
  });

  it('renders required fields', () => {
    render(<CheckoutForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono|telefono/i)).toBeInTheDocument();
  });

  it('renders payment method options', () => {
    render(<CheckoutForm onSubmit={jest.fn()} />);
    expect(screen.getByText(/tarjeta/i)).toBeInTheDocument();
    expect(screen.getByText(/PSE/i)).toBeInTheDocument();
    expect(screen.getByText(/contra entrega/i)).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted with valid data', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<CheckoutForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/nombre/i), 'Juan');
    await user.type(screen.getByLabelText(/apellido/i), 'Pérez');
    await user.type(screen.getByLabelText(/email/i), 'juan@test.com');
    await user.type(screen.getByLabelText(/teléfono|telefono/i), '3001234567');

    fireEvent.submit(screen.getAllByRole('button', { name: /finalizar|confirmar|pagar/i })[0].closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('renders submit button', () => {
    render(<CheckoutForm onSubmit={jest.fn()} />);
    expect(screen.getAllByRole('button', { name: /finalizar/i })[0]).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<CheckoutForm onSubmit={jest.fn()} isLoading />);
    const submitBtn = screen.getAllByRole('button', { name: /procesando|finalizar/i })[0];
    expect(submitBtn).toBeDisabled();
  });

  it('renders cart summary when provided', () => {
    render(
      <CheckoutForm
        onSubmit={jest.fn()}
        cartSummary={<div data-testid="cart-summary">Resumen</div>}
      />
    );
    expect(screen.getByTestId('cart-summary')).toBeInTheDocument();
  });
});
