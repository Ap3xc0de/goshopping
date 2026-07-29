import React from 'react';
import { render } from '@testing-library/react';
import { SalesBarChart } from '../SalesBarChart';

// Recharts uses ResizeObserver which is not available in jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const MOCK_DATA = [
  { date: '2024-06-01', revenue: 100000, orders: 5 },
  { date: '2024-06-02', revenue: 150000, orders: 7 },
  { date: '2024-06-03', revenue: 80000, orders: 4 },
];

describe('SalesBarChart', () => {
  it('renders without crashing', () => {
    expect(() => render(<SalesBarChart data={MOCK_DATA} />)).not.toThrow();
  });

  it('renders with empty data', () => {
    expect(() => render(<SalesBarChart data={[]} />)).not.toThrow();
  });
});
