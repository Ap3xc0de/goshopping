import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  const cases = [
    { status: 'pending', label: 'Pendiente' },
    { status: 'paid', label: 'Pagado' },
    { status: 'preparing', label: 'En preparación' },
    { status: 'shipped', label: 'Despachado' },
    { status: 'delivered', label: 'Entregado' },
    { status: 'cancelled', label: 'Cancelado' },
  ] as const;

  cases.forEach(({ status, label }) => {
    it(`renders label for ${status}`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
