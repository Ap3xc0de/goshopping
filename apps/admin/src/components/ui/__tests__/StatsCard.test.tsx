import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '../StatsCard';

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Ventas" value="$100,000" />);
    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatsCard title="Ventas" value="$100,000" subtitle="Este mes" />);
    expect(screen.getByText('Este mes')).toBeInTheDocument();
  });

  it('renders alert with orange styles when alert=true', () => {
    const { container } = render(<StatsCard title="Stock" value="3" alert />);
    expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
  });

  it('renders normal white card when alert=false', () => {
    const { container } = render(<StatsCard title="Ventas" value="$100" />);
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
  });
});
