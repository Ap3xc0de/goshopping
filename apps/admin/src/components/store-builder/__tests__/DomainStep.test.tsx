import { render, screen } from '@testing-library/react';
import { DomainStep } from '../DomainStep';

describe('DomainStep', () => {
  it('displays the generic hostname assigned to the store', () => {
    render(<DomainStep hostname="mi-tienda.goshopping.com" />);
    expect(screen.getByTestId('domain-hostname')).toHaveTextContent('mi-tienda.goshopping.com');
  });

  it('does not render any custom domain input or verification UI', () => {
    render(<DomainStep hostname="mi-tienda.goshopping.com" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a pending state when the hostname is not yet available', () => {
    render(<DomainStep hostname={null} />);
    expect(screen.queryByTestId('domain-hostname')).not.toBeInTheDocument();
    expect(screen.getByTestId('domain-pending')).toBeInTheDocument();
  });

  it('shows a loading state while the hostname is being fetched', () => {
    render(<DomainStep hostname={null} loading />);
    expect(screen.getByTestId('domain-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('domain-pending')).not.toBeInTheDocument();
  });
});
