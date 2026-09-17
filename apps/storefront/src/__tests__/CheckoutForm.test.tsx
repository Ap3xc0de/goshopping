/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutForm, type CheckoutData } from '@/components/checkout/CheckoutForm';

const EMPTY_DATA: CheckoutData = {
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

describe('CheckoutForm', () => {
  it('renders all required form sections', () => {
    render(<CheckoutForm data={EMPTY_DATA} onChange={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByText(/datos de contacto/i)).toBeInTheDocument();
    // "Dirección" appears as both a section heading and field label
    expect(screen.getAllByText(/direcci[oó]n/i).length).toBeGreaterThan(0);
  });

  it('renders required fields (name, email, phone, address)', () => {
    render(<CheckoutForm data={EMPTY_DATA} onChange={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono|telefono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^dirección/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ciudad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/código postal/i)).toBeInTheDocument();
  });

  it('renders optional country and notes fields', () => {
    render(<CheckoutForm data={EMPTY_DATA} onChange={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/país/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notas/i)).toBeInTheDocument();
  });

  it('calls onChange when a field is typed into', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<CheckoutForm data={EMPTY_DATA} onChange={onChange} onSubmit={jest.fn()} />);

    await user.type(screen.getByLabelText(/nombre completo/i), 'Juan');
    expect(onChange).toHaveBeenCalledWith('name', expect.any(String));
  });

  it('shows inline error messages when provided', () => {
    render(
      <CheckoutForm
        data={EMPTY_DATA}
        errors={{ email: 'El email es obligatorio' }}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByText('El email es obligatorio')).toBeInTheDocument();
  });

  it('calls onSubmit when the form is submitted', () => {
    const onSubmit = jest.fn();
    render(<CheckoutForm data={EMPTY_DATA} onChange={jest.fn()} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getAllByRole('button', { name: /pagar/i })[0].closest('form')!);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('renders cart summary when provided', () => {
    render(
      <CheckoutForm
        data={EMPTY_DATA}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        cartSummary={<div data-testid="cart-summary">Resumen</div>}
      />,
    );
    expect(screen.getByTestId('cart-summary')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<CheckoutForm data={EMPTY_DATA} onChange={jest.fn()} onSubmit={jest.fn()} isLoading />);
    const submitBtn = screen.getAllByRole('button', { name: /procesando|pagar/i })[0];
    expect(submitBtn).toBeDisabled();
  });
});
