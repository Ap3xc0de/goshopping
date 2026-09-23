import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoriesPage from '../page';
import { useStore } from '@/lib/hooks/useStore';
import { api, ApiError } from '@/lib/api';
import type { Category } from '@/lib/types';

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: {
      listCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    },
  };
});

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;
const mockApi = api as jest.Mocked<typeof api>;

const parent: Category = {
  id: 'cat-1',
  store_id: 'store-1',
  name: 'Ropa',
  slug: 'ropa',
  parent_id: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const child: Category = {
  id: 'cat-2',
  store_id: 'store-1',
  name: 'Camisetas',
  slug: 'camisetas',
  parent_id: 'cat-1',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('CategoriesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
  });

  async function renderPage() {
    render(<CategoriesPage />);
    await waitFor(() => expect(mockApi.listCategories).toHaveBeenCalledWith('store-1'));
  }

  it('renders the category tree with nested children', async () => {
    mockApi.listCategories.mockResolvedValueOnce({ categories: [parent, child], count: 2 });
    await renderPage();

    expect(await screen.findByText('Ropa')).toBeInTheDocument();
    expect(screen.getByText('Camisetas')).toBeInTheDocument();
  });

  it('creates a new root category', async () => {
    mockApi.listCategories.mockResolvedValueOnce({ categories: [], count: 0 });
    const created: Category = { ...parent, id: 'cat-3', name: 'Accesorios', slug: 'accesorios' };
    mockApi.createCategory.mockResolvedValueOnce(created);
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: /nueva categoría/i }));
    await user.type(screen.getByLabelText(/^nombre/i), 'Accesorios');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() =>
      expect(mockApi.createCategory).toHaveBeenCalledWith(
        'store-1',
        expect.objectContaining({ name: 'Accesorios' }),
      ),
    );
    expect(await screen.findByText('Accesorios')).toBeInTheDocument();
  });

  it('deletes a leaf category', async () => {
    mockApi.listCategories.mockResolvedValueOnce({ categories: [parent, child], count: 2 });
    mockApi.deleteCategory.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText('Camisetas');
    await user.click(screen.getByRole('button', { name: /eliminar camisetas/i }));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mockApi.deleteCategory).toHaveBeenCalledWith('store-1', 'cat-2'));
    await waitFor(() => expect(screen.queryByText('Camisetas')).not.toBeInTheDocument());
  });

  it('shows a toast (not a crash) when deleting a parent with children returns 409', async () => {
    mockApi.listCategories.mockResolvedValueOnce({ categories: [parent, child], count: 2 });
    mockApi.deleteCategory.mockRejectedValueOnce(
      new ApiError(409, 'category_has_children', 'category has children'),
    );
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText('Ropa');
    await user.click(screen.getByRole('button', { name: /eliminar ropa/i }));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mockApi.deleteCategory).toHaveBeenCalledWith('store-1', 'cat-1'));
    expect(await screen.findByText(/subcategor/i)).toBeInTheDocument();
    expect(screen.getByText('Ropa')).toBeInTheDocument();
  });

  it('edits a category name', async () => {
    mockApi.listCategories.mockResolvedValueOnce({ categories: [parent, child], count: 2 });
    const updated: Category = { ...child, name: 'Poleras', slug: 'poleras' };
    mockApi.updateCategory.mockResolvedValueOnce(updated);
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText('Camisetas');
    await user.click(screen.getByRole('button', { name: /editar camisetas/i }));
    const nameInput = screen.getByLabelText(/^nombre/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Poleras');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() =>
      expect(mockApi.updateCategory).toHaveBeenCalledWith(
        'store-1',
        'cat-2',
        expect.objectContaining({ name: 'Poleras' }),
      ),
    );
    expect(await screen.findByText('Poleras')).toBeInTheDocument();
  });
});
