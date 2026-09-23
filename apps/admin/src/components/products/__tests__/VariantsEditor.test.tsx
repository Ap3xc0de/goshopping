import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariantsEditor } from '../VariantsEditor';
import { api } from '@/lib/api';
import type { ProductVariant } from '@/lib/types';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: {
      listVariants: jest.fn(),
      createVariant: jest.fn(),
      updateVariant: jest.fn(),
      deleteVariant: jest.fn(),
    },
  };
});

const mockApi = api as jest.Mocked<typeof api>;

const baseVariant: ProductVariant = {
  id: 'variant-1',
  store_id: 'store-1',
  product_id: 'product-1',
  sku: 'CAM-001-M-AZUL',
  size: 'M',
  color: 'Azul',
  price_override: null,
  stock: 10,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('VariantsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderEditor() {
    render(<VariantsEditor storeId="store-1" productId="product-1" />);
    await waitFor(() => expect(mockApi.listVariants).toHaveBeenCalledWith('store-1', 'product-1'));
  }

  it('shows an empty state when the product has no variants', async () => {
    mockApi.listVariants.mockResolvedValueOnce({ variants: [], count: 0 });
    await renderEditor();

    await waitFor(() =>
      expect(screen.getByText(/no tiene variantes/i)).toBeInTheDocument(),
    );
  });

  it('lists existing variants with sku, size, color, stock and status', async () => {
    mockApi.listVariants.mockResolvedValueOnce({ variants: [baseVariant], count: 1 });
    await renderEditor();

    expect(await screen.findByText('CAM-001-M-AZUL')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('Azul')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('creates a variant and adds it to the list', async () => {
    mockApi.listVariants.mockResolvedValueOnce({ variants: [], count: 0 });
    const created: ProductVariant = { ...baseVariant, id: 'variant-2', sku: 'CAM-001-L-ROJO', size: 'L', color: 'Rojo' };
    mockApi.createVariant.mockResolvedValueOnce(created);
    const user = userEvent.setup();
    await renderEditor();

    await waitFor(() => expect(screen.getByText(/no tiene variantes/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /agregar variante/i }));
    await user.type(screen.getByLabelText(/sku/i), 'CAM-001-L-ROJO');
    await user.type(screen.getByLabelText(/talla/i), 'L');
    await user.type(screen.getByLabelText(/color/i), 'Rojo');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() =>
      expect(mockApi.createVariant).toHaveBeenCalledWith(
        'store-1',
        'product-1',
        expect.objectContaining({ sku: 'CAM-001-L-ROJO', size: 'L', color: 'Rojo' }),
      ),
    );
    expect(await screen.findByText('CAM-001-L-ROJO')).toBeInTheDocument();
  });

  it('edits a variant and updates the list', async () => {
    mockApi.listVariants.mockResolvedValueOnce({ variants: [baseVariant], count: 1 });
    const updated: ProductVariant = { ...baseVariant, stock: 25 };
    mockApi.updateVariant.mockResolvedValueOnce(updated);
    const user = userEvent.setup();
    await renderEditor();

    await screen.findByText('CAM-001-M-AZUL');
    await user.click(screen.getByRole('button', { name: /editar cam-001-m-azul/i }));
    const stockInput = screen.getByLabelText(/stock/i);
    await user.clear(stockInput);
    await user.type(stockInput, '25');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() =>
      expect(mockApi.updateVariant).toHaveBeenCalledWith(
        'store-1',
        'product-1',
        'variant-1',
        expect.objectContaining({ stock: 25 }),
      ),
    );
    expect(await screen.findByText('25')).toBeInTheDocument();
  });

  it('deletes a variant after confirmation', async () => {
    mockApi.listVariants.mockResolvedValueOnce({ variants: [baseVariant], count: 1 });
    mockApi.deleteVariant.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await renderEditor();

    await screen.findByText('CAM-001-M-AZUL');
    await user.click(screen.getByRole('button', { name: /eliminar cam-001-m-azul/i }));

    const dialog = await screen.findByText(/¿eliminar la variante/i);
    const dialogContainer = dialog.closest('div');
    expect(dialogContainer).not.toBeNull();
    await user.click(within(dialogContainer!.parentElement as HTMLElement).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() =>
      expect(mockApi.deleteVariant).toHaveBeenCalledWith('store-1', 'product-1', 'variant-1'),
    );
    await waitFor(() => expect(screen.queryByText('CAM-001-M-AZUL')).not.toBeInTheDocument());
  });
});
