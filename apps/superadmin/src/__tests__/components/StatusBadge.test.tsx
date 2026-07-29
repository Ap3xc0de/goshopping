import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders label', () => {
    render(<StatusBadge label="active" variant="green" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('applies green variant classes', () => {
    const { container } = render(<StatusBadge label="active" variant="green" />);
    expect(container.firstChild).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('applies red variant classes', () => {
    const { container } = render(<StatusBadge label="suspended" variant="red" />);
    expect(container.firstChild).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('applies yellow variant classes', () => {
    const { container } = render(<StatusBadge label="pending" variant="yellow" />);
    expect(container.firstChild).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });
});
