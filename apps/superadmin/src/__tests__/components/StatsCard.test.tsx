import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/ui/StatsCard';

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Cuentas" value={42} />);
    expect(screen.getByText('Cuentas')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatsCard title="Tiendas" value={10} subtitle="5 activas" />);
    expect(screen.getByText('5 activas')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    render(<StatsCard title="Ventas" value={100} trend={{ value: 12, label: 'este mes' }} />);
    expect(screen.getByText(/12%/)).toBeInTheDocument();
    expect(screen.getByText(/este mes/)).toBeInTheDocument();
  });

  it('shows negative trend in red text', () => {
    const { container } = render(
      <StatsCard title="Ventas" value={100} trend={{ value: -5, label: 'este mes' }} />,
    );
    const trendEl = container.querySelector('.text-red-600');
    expect(trendEl).toBeInTheDocument();
  });
});
