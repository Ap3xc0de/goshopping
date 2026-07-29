import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchInput } from '@/components/ui/SearchInput';

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    jest.useRealTimers();
    render(<SearchInput value="" onChange={jest.fn()} placeholder="Buscar…" />);
    expect(screen.getByPlaceholderText('Buscar…')).toBeInTheDocument();
  });

  it('calls onChange after debounce delay', () => {
    const onChange = jest.fn();
    render(<SearchInput value="" onChange={onChange} debounceMs={300} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onChange).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('does NOT call onChange before debounce elapses', () => {
    const onChange = jest.fn();
    render(<SearchInput value="" onChange={onChange} debounceMs={300} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'ab' } });
    act(() => jest.advanceTimersByTime(100));
    expect(onChange).not.toHaveBeenCalled();
  });
});
