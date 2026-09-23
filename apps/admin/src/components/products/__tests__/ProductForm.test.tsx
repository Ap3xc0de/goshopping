import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from '../ProductForm';
import type { Product } from '@/lib/types';

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
});
