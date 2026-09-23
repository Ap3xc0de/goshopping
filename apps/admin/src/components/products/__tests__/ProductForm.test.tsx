import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from '../ProductForm';
import type { Category, Product } from '@/lib/types';

// bug/product-category-id-not-persisted fixtures: Monturas (root, has a
// child -> not assignable), Salto (leaf under Monturas -> "Monturas › Salto"),
// Accesorios (leaf root -> "Accesorios").
const CATEGORIES: Category[] = [
  {
    id: 'monturas-id',
    store_id: 's1',
    name: 'Monturas',
    slug: 'monturas',
    parent_id: null,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'salto-id',
    store_id: 's1',
    name: 'Salto',
    slug: 'salto',
    parent_id: 'monturas-id',
    sort_order: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'accesorios-id',
    store_id: 's1',
    name: 'Accesorios',
    slug: 'accesorios',
    parent_id: null,
    sort_order: 1,
    created_at: '',
    updated_at: '',
  },
];

describe('ProductForm', () => {
  it('renders a "Peso (kg)" field', () => {
    render(<ProductForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/peso \(kg\)/i)).toBeInTheDocument();
  });

  it('pre-fills the weight field from the initial product', () => {
    const initial: Partial<Product> = { weight: 1.25 };
    render(<ProductForm initial={initial} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/peso \(kg\)/i)).toHaveValue(1.25);
  });

  it('submits the weight value entered by the user', async () => {
    const onSubmit = jest.fn().mockResolvedValue(null);
    const user = userEvent.setup();
    render(<ProductForm initial={{ name: 'Silla de montar' }} onSubmit={onSubmit} />);

    await user.clear(screen.getByLabelText(/peso \(kg\)/i));
    await user.type(screen.getByLabelText(/peso \(kg\)/i), '3.5');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ weight: 3.5 }));
  });

  describe('category select', () => {
    it('renders "Sin categoría" plus leaves selectable and parents (with children) disabled, labeled with full path', () => {
      const { container } = render(<ProductForm onSubmit={jest.fn()} categories={CATEGORIES} />);
      const select = screen.getByLabelText(/categoría/i) as HTMLSelectElement;
      const options = Array.from(container.querySelectorAll('option')) as HTMLOptionElement[];
      void select;

      const none = options.find((o) => o.textContent === 'Sin categoría');
      expect(none).toBeTruthy();
      expect(none?.value).toBe('');

      const monturas = options.find((o) => o.textContent === 'Monturas');
      expect(monturas).toBeTruthy();
      expect(monturas?.disabled).toBe(true);

      const salto = options.find((o) => o.textContent === 'Monturas › Salto');
      expect(salto).toBeTruthy();
      expect(salto?.disabled).toBe(false);
      expect(salto?.value).toBe('salto-id');

      const accesorios = options.find((o) => o.textContent === 'Accesorios');
      expect(accesorios).toBeTruthy();
      expect(accesorios?.disabled).toBe(false);
    });

    it('shows only "Sin categoría" and a hint when the store has no categories', () => {
      render(<ProductForm onSubmit={jest.fn()} categories={[]} />);
      const select = screen.getByLabelText(/categoría/i) as HTMLSelectElement;
      expect(select.options.length).toBe(1);
      expect(select.options[0].textContent).toBe('Sin categoría');
      expect(screen.getByText(/no hay categorías/i)).toBeInTheDocument();
    });

    it('preselects the product\'s category_id on edit', () => {
      render(
        <ProductForm
          initial={{ name: 'Bridle', category_id: 'salto-id' }}
          onSubmit={jest.fn()}
          categories={CATEGORIES}
        />,
      );
      expect(screen.getByLabelText(/categoría/i)).toHaveValue('salto-id');
    });

    it('shows "Sin categoría" selected when the product only has legacy free-text category', () => {
      render(
        <ProductForm
          initial={{ name: 'Old Product', category: 'legacy-text' }}
          onSubmit={jest.fn()}
          categories={CATEGORIES}
        />,
      );
      expect(screen.getByLabelText(/categoría/i)).toHaveValue('');
      expect(screen.getByText(/legacy-text/)).toBeInTheDocument();
    });

    it('submits category_id and stops sending free-text category when a leaf is selected', async () => {
      const onSubmit = jest.fn().mockResolvedValue(null);
      const user = userEvent.setup();
      render(
        <ProductForm initial={{ name: 'Bridle' }} onSubmit={onSubmit} categories={CATEGORIES} />,
      );

      await user.selectOptions(screen.getByLabelText(/categoría/i), 'accesorios-id');
      await user.click(screen.getByRole('button', { name: /guardar/i }));

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category_id: 'accesorios-id' }));
      const payload = onSubmit.mock.calls[0][0];
      expect(payload).not.toHaveProperty('category');
    });

    it('submits "" to clear an existing category assignment', async () => {
      const onSubmit = jest.fn().mockResolvedValue(null);
      const user = userEvent.setup();
      render(
        <ProductForm
          initial={{ name: 'Bridle', category_id: 'salto-id' }}
          onSubmit={onSubmit}
          categories={CATEGORIES}
        />,
      );

      await user.selectOptions(screen.getByLabelText(/categoría/i), '');
      await user.click(screen.getByRole('button', { name: /guardar/i }));

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category_id: '' }));
    });

    it('omits category_id entirely when the selection was not touched (leaves it unchanged server-side)', async () => {
      const onSubmit = jest.fn().mockResolvedValue(null);
      const user = userEvent.setup();
      render(
        <ProductForm
          initial={{ name: 'Bridle', category_id: 'salto-id' }}
          onSubmit={onSubmit}
          categories={CATEGORIES}
        />,
      );

      await user.click(screen.getByRole('button', { name: /guardar/i }));

      const payload = onSubmit.mock.calls[0][0];
      expect(payload).not.toHaveProperty('category_id');
    });
  });
});
