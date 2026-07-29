import { formatCurrency, formatNumber, calculateTax, ORDER_NEXT_STATUS, ORDER_STATUS_LABELS, classNames } from './utils';

describe('formatCurrency', () => {
  it('formats COP amounts', () => {
    const result = formatCurrency(10000);
    expect(result).toContain('10');
    expect(result).toContain('000');
  });

  it('handles zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });
});

describe('formatNumber', () => {
  it('formats numbers with separators', () => {
    // locale-aware: result contains '1' and '000'
    expect(formatNumber(1000)).toMatch(/1.000|1,000/);
    expect(formatNumber(0)).toBe('0');
  });
});

describe('calculateTax', () => {
  it('calculates 19% IVA by default', () => {
    expect(calculateTax(100000)).toBe(19000);
  });

  it('accepts custom rate', () => {
    expect(calculateTax(100000, 0.05)).toBe(5000);
  });

  it('rounds to integer', () => {
    const result = calculateTax(333);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('ORDER_NEXT_STATUS', () => {
  it('pending -> paid', () => expect(ORDER_NEXT_STATUS['pending']).toBe('paid'));
  it('paid -> preparing', () => expect(ORDER_NEXT_STATUS['paid']).toBe('preparing'));
  it('preparing -> shipped', () => expect(ORDER_NEXT_STATUS['preparing']).toBe('shipped'));
  it('shipped -> delivered', () => expect(ORDER_NEXT_STATUS['shipped']).toBe('delivered'));
  it('delivered has no next', () => expect(ORDER_NEXT_STATUS['delivered']).toBeUndefined());
  it('cancelled has no next', () => expect(ORDER_NEXT_STATUS['cancelled']).toBeUndefined());
});

describe('ORDER_STATUS_LABELS', () => {
  it('all statuses have labels', () => {
    const statuses = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'] as const;
    statuses.forEach((s) => {
      expect(ORDER_STATUS_LABELS[s]).toBeTruthy();
    });
  });
});

describe('classNames', () => {
  it('joins truthy classes', () => {
    expect(classNames('foo', 'bar')).toBe('foo bar');
    expect(classNames('foo', '', 'bar')).toBe('foo bar');
    expect(classNames('foo', undefined as unknown as string, 'bar')).toBe('foo bar');
  });
});
