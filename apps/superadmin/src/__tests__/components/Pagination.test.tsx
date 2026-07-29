import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '@/components/ui/Pagination';

describe('Pagination', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onPageChange with next page on Siguiente click', () => {
    const onChange = jest.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onChange} />);
    fireEvent.click(screen.getByText('Siguiente'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with prev page on Anterior click', () => {
    const onChange = jest.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onChange} />);
    fireEvent.click(screen.getByText('Anterior'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables Anterior on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByText('Anterior').closest('button')).toBeDisabled();
  });

  it('disables Siguiente on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={jest.fn()} />);
    expect(screen.getByText('Siguiente').closest('button')).toBeDisabled();
  });
});
