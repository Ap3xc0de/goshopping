import { render, screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useStore } from '@/lib/hooks/useStore';

jest.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('Sidebar', () => {
  beforeEach(() => {
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
  });

  it('shows a "Mi Tienda" link pointing to the developer hub (ADMIN-01)', () => {
    render(<Sidebar collapsed={false} onToggle={jest.fn()} />);
    const link = screen.getByRole('link', { name: /Mi Tienda/i });
    expect(link).toHaveAttribute('href', '/dashboard/my-store');
  });

  it('does not show a "Crear Tienda" link', () => {
    render(<Sidebar collapsed={false} onToggle={jest.fn()} />);
    expect(screen.queryByRole('link', { name: /Crear Tienda/i })).not.toBeInTheDocument();
  });

  it('shows a "Categorías" link pointing to the category tree page', () => {
    render(<Sidebar collapsed={false} onToggle={jest.fn()} />);
    const link = screen.getByRole('link', { name: /Categorías/i });
    expect(link).toHaveAttribute('href', '/dashboard/categories');
  });
});
