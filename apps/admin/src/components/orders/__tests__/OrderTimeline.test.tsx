import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrderTimeline } from '../OrderTimeline';
import type { OrderTimelineEntry } from '@/lib/types';

const entry = (status: OrderTimelineEntry['status'], note?: string): OrderTimelineEntry => ({
  id: `entry-${status}`,
  status,
  note,
  changed_by: 'user-1',
  changed_by_name: 'Juan',
  created_at: '2024-06-01T10:00:00Z',
});

describe('OrderTimeline', () => {
  it('renders a status label', () => {
    render(<OrderTimeline timeline={[entry('pending')]} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders a note when provided', () => {
    render(<OrderTimeline timeline={[entry('paid', 'Pago recibido por transferencia')]} />);
    expect(screen.getByText('Pago recibido por transferencia')).toBeInTheDocument();
  });

  it('renders changed_by_name', () => {
    render(<OrderTimeline timeline={[entry('preparing')]} />);
    expect(screen.getByText('Juan')).toBeInTheDocument();
  });

  it('renders multiple entries', () => {
    render(<OrderTimeline timeline={[entry('pending'), entry('paid'), entry('preparing')]} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    expect(screen.getByText('En preparación')).toBeInTheDocument();
  });

  it('renders all statuses without crashing', () => {
    const statuses: OrderTimelineEntry['status'][] = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];
    render(<OrderTimeline timeline={statuses.map((s) => entry(s))} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });
});
