import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyStorePage from '../page';
import { useStore } from '@/lib/hooks/useStore';
import { api } from '@/lib/api';
import type { StoreAPIKey } from '@/lib/types';

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: {
      getStore: jest.fn(),
      listAPIKeys: jest.fn(),
      createAPIKey: jest.fn(),
      revokeAPIKey: jest.fn(),
    },
  };
});

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;
const mockApi = api as jest.Mocked<typeof api>;

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

const secret = 'gsk_0123456789abcdef0123456789abcdef01234567';
const baseKey: StoreAPIKey = {
  id: 'key-1',
  store_id: 'store-1',
  name: 'Mi app',
  prefix: 'gsk_01234567',
  active: true,
  created_at: '2026-09-01T00:00:00Z',
};

describe('MyStorePage (Mi Tienda developer hub)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda Demo', stores: [] });
    mockApi.getStore.mockResolvedValue({ id: 'store-1', name: 'Tienda Demo', slug: 'tienda-abc' });
    mockApi.listAPIKeys.mockResolvedValue([baseKey]);
  });

  async function renderPage() {
    render(<MyStorePage />);
    await waitFor(() => expect(screen.getByTestId('store-slug')).toHaveTextContent('tienda-abc'));
  }

  it('shows the store slug and the API base URL + /api/v1/:slug endpoint', async () => {
    await renderPage();

    expect(screen.getByTestId('store-slug')).toHaveTextContent('tienda-abc');
    expect(screen.getByTestId('api-base-url')).toHaveTextContent(
      `${API_BASE}/api/v1/tienda-abc`,
    );
  });

  it('lists existing keys masked (name + prefix, no plaintext)', async () => {
    await renderPage();

    expect(screen.getByText('Mi app')).toBeInTheDocument();
    expect(screen.getByText(/gsk_01234567/)).toBeInTheDocument();
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
  });

  it('creates a key and shows the plaintext exactly once', async () => {
    const user = userEvent.setup();
    mockApi.createAPIKey.mockResolvedValueOnce({
      api_key: { ...baseKey, id: 'key-2', name: 'Nueva clave', prefix: secret.slice(0, 12) },
      plaintext: secret,
    });
    await renderPage();

    await user.type(screen.getByLabelText('Nombre de la clave'), 'Nueva clave');
    await user.click(screen.getByRole('button', { name: 'Crear clave' }));

    await waitFor(() =>
      expect(mockApi.createAPIKey).toHaveBeenCalledWith('store-1', 'Nueva clave'),
    );
    expect(screen.getByTestId('new-key-plaintext')).toHaveTextContent(secret);
  });

  it('revokes a key and removes it from the list', async () => {
    const user = userEvent.setup();
    mockApi.revokeAPIKey.mockResolvedValueOnce(undefined);
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Revocar Mi app' }));

    await waitFor(() => expect(mockApi.revokeAPIKey).toHaveBeenCalledWith('store-1', 'key-1'));
    expect(screen.queryByText('Mi app')).not.toBeInTheDocument();
  });

  it('does not render the branding editor or preview', async () => {
    await renderPage();

    expect(screen.queryByLabelText('Primario')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mi-tienda-preview')).not.toBeInTheDocument();
  });
});
