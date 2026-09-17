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

  it('shows a "Mi Tienda" link pointing to the branding module (ADMIN-01)', () => {
    render(<Sidebar collapsed={false} onToggle={jest.fn()} />);
    const link = screen.getByRole('link', { name: /Mi Tienda/i });
    expect(link).toHaveAttribute('href', '/dashboard/my-store');
  });
});
