import { render, screen } from '@testing-library/react';
import SettingsPage from '../page';
import { useAuth } from '@/lib/hooks/useAuth';

jest.mock('@/lib/hooks/useAuth', () => ({ useAuth: jest.fn() }));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('SettingsPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      account: {
        id: 'acc-1',
        name: 'Pedro',
        email: 'pedro@example.com',
        role: 'owner',
        status: 'active',
        stores: [],
        created_at: '',
        updated_at: '',
      },
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });
  });

  it('shows the store currency as USD (design: single fixed currency, no selector)', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Moneda')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });
});
