import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockIndicator } from '../StockIndicator';

describe('StockIndicator', () => {
  it('shows "Sin stock" when stock is 0', () => {
    render(<StockIndicator stock={0} minStock={5} />);
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });

  it('shows "Stock bajo" when stock is at or below minStock', () => {
    render(<StockIndicator stock={5} minStock={5} />);
    expect(screen.getByText('Stock bajo')).toBeInTheDocument();
  });

  it('shows "Stock bajo" when stock is below minStock', () => {
    render(<StockIndicator stock={2} minStock={10} />);
    expect(screen.getByText('Stock bajo')).toBeInTheDocument();
  });

  it('shows "En stock" when stock is above minStock', () => {
    render(<StockIndicator stock={20} minStock={5} />);
    expect(screen.getByText('En stock')).toBeInTheDocument();
  });

  it('hides label when showLabel=false', () => {
    render(<StockIndicator stock={20} minStock={5} showLabel={false} />);
    expect(screen.queryByText('En stock')).not.toBeInTheDocument();
  });

  it('shows stock count', () => {
    render(<StockIndicator stock={42} minStock={5} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
