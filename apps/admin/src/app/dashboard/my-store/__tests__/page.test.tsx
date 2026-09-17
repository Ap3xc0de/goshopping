import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyStorePage from '../page';
import { useStore } from '@/lib/hooks/useStore';
import { api } from '@/lib/api';
import type { StoreBranding, StoreDomain } from '@/lib/types';

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: { getBranding: jest.fn(), updateBranding: jest.fn(), getStoreDomain: jest.fn() },
  };
});

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;
const mockApi = api as jest.Mocked<typeof api>;

const baseBranding: StoreBranding = {
  brand_name: 'Tienda Demo',
  colors: {
    primary: '0 0% 9%',
    primary_foreground: '0 0% 98%',
    secondary: '0 0% 96%',
    secondary_foreground: '0 0% 9%',
    accent: '39 45% 62%',
    accent_foreground: '0 0% 9%',
    background: '0 0% 100%',
    foreground: '0 0% 9%',
    muted: '0 0% 96%',
    nav_background: '0 0% 100%',
    nav_text: '0 0% 9%',
  },
  fonts: { heading: 'Playfair Display', body: 'Inter' },
  radius: 'md',
};

const baseDomain: StoreDomain = {
  hostname: 'tienda-demo.goshopping.app',
  kind: 'generic',
  status: 'active',
  is_primary: true,
};

describe('MyStorePage (Mi Tienda)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda Demo', stores: [] });
    mockApi.getBranding.mockResolvedValue(baseBranding);
    mockApi.getStoreDomain.mockResolvedValue(baseDomain);
  });

  async function renderPage() {
    render(<MyStorePage />);
    await waitFor(() => expect(screen.getByLabelText('Primario')).toHaveValue('0 0% 9%'));
  }

  it('renders the 11 color fields, both font selects and the 4 radius options from loaded branding (ADMIN-02)', async () => {
    await renderPage();

    const colorLabels = [
      'Primario',
      'Texto sobre primario',
      'Secundario',
      'Texto sobre secundario',
      'Acento',
      'Texto sobre acento',
      'Fondo',
      'Texto principal',
      'Fondo tenue',
      'Fondo del menú de navegación',
      'Texto del menú de navegación',
    ];
    for (const label of colorLabels) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }

    expect(screen.getByLabelText('Fuente de títulos')).toHaveValue('Playfair Display');
    expect(screen.getByLabelText('Fuente de texto')).toHaveValue('Inter');

    expect(screen.getByRole('radio', { name: 'Pequeño' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medio' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Grande' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Extra grande' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Ver mi tienda/i })).toHaveAttribute(
      'href',
      'https://tienda-demo.goshopping.app',
    );
  });

  it('updates the live preview CSS var as soon as a color field changes, before saving (ADMIN-03)', async () => {
    const user = userEvent.setup();
    await renderPage();

    const preview = screen.getByTestId('mi-tienda-preview');
    expect(preview.style.getPropertyValue('--brand-primary')).toBe('0 0% 9%');

    const primaryInput = screen.getByLabelText('Primario');
    await user.clear(primaryInput);
    await user.type(primaryInput, '10 80% 40%');

    expect(preview.style.getPropertyValue('--brand-primary')).toBe('10 80% 40%');
    expect(mockApi.updateBranding).not.toHaveBeenCalled();
  });

  it('Guardar calls updateBranding with the edited draft and shows a success toast', async () => {
    const user = userEvent.setup();
    mockApi.updateBranding.mockResolvedValueOnce({
      ...baseBranding,
      colors: { ...baseBranding.colors, primary: '10 80% 40%' },
    });
    await renderPage();

    const primaryInput = screen.getByLabelText('Primario');
    await user.clear(primaryInput);
    await user.type(primaryInput, '10 80% 40%');

    const saveBtn = screen.getByRole('button', { name: 'Guardar' });
    expect(saveBtn).toBeEnabled();
    await user.click(saveBtn);

    await waitFor(() =>
      expect(mockApi.updateBranding).toHaveBeenCalledWith(
        'store-1',
        expect.objectContaining({ colors: expect.objectContaining({ primary: '10 80% 40%' }) }),
      ),
    );
    expect(await screen.findByText(/Cambios guardados/i)).toBeInTheDocument();
  });

  it('Restablecer reverts unsaved changes back to the loaded branding', async () => {
    const user = userEvent.setup();
    await renderPage();

    const primaryInput = screen.getByLabelText('Primario');
    await user.clear(primaryInput);
    await user.type(primaryInput, '10 80% 40%');
    expect(primaryInput).toHaveValue('10 80% 40%');

    const resetBtn = screen.getByRole('button', { name: 'Restablecer' });
    await user.click(resetBtn);

    expect(primaryInput).toHaveValue('0 0% 9%');
    expect(mockApi.updateBranding).not.toHaveBeenCalled();
  });

  it('blocks Guardar and shows an inline message when a color field has an invalid HSL value', async () => {
    const user = userEvent.setup();
    await renderPage();

    const primaryInput = screen.getByLabelText('Primario');
    await user.clear(primaryInput);
    await user.type(primaryInput, '#zzz');

    expect(screen.getByText(/Formato inválido/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(mockApi.updateBranding).not.toHaveBeenCalled();
  });
});
