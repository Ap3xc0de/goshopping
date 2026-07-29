import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  accountStatusColor,
  storeStatusColor,
  integrationStatusColor,
  buildQueryString,
  classNames,
} from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats positive amounts in COP', () => {
    const result = formatCurrency(50000);
    expect(result).toContain('50');
    // Intl output varies by Node version/platform; just check it's non-empty
    expect(result.length).toBeGreaterThan(1);
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toBeTruthy();
  });
});

describe('formatNumber', () => {
  it('formats with thousands separator', () => {
    const result = formatNumber(1000000);
    // es-CO uses . as thousand separator
    expect(result).toMatch(/1[.,]000[.,]000|1\.000\.000|1,000,000/);
  });
});

describe('formatDate', () => {
  it('formats ISO string to dd/MM/yyyy', () => {
    // Use noon UTC to avoid off-by-one day in any timezone
    const result = formatDate('2024-01-15T12:00:00Z');
    expect(result).toMatch(/15\/01\/2024/);
  });

  it('returns original string on parse error', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDateTime', () => {
  it('includes time component', () => {
    const result = formatDateTime('2024-06-01T14:30:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('status colors', () => {
  it('returns green for active account', () => {
    expect(accountStatusColor('active')).toBe('green');
  });
  it('returns red for suspended account', () => {
    expect(accountStatusColor('suspended')).toBe('red');
  });
  it('returns yellow for pending account', () => {
    expect(accountStatusColor('pending')).toBe('yellow');
  });
  it('returns green for active store', () => {
    expect(storeStatusColor('active')).toBe('green');
  });
  it('returns green for healthy integration', () => {
    expect(integrationStatusColor('healthy')).toBe('green');
  });
  it('returns red for down integration', () => {
    expect(integrationStatusColor('down')).toBe('red');
  });
  it('returns yellow for degraded integration', () => {
    expect(integrationStatusColor('degraded')).toBe('yellow');
  });
});

describe('buildQueryString', () => {
  it('builds query string from params', () => {
    const qs = buildQueryString({ page: 1, search: 'hello' });
    expect(qs).toContain('page=1');
    expect(qs).toContain('search=hello');
    expect(qs).toMatch(/^\?/);
  });

  it('excludes undefined values', () => {
    const qs = buildQueryString({ page: 1, search: undefined });
    expect(qs).not.toContain('search');
  });

  it('returns empty string when all values are undefined', () => {
    expect(buildQueryString({ a: undefined })).toBe('');
  });
});

describe('classNames', () => {
  it('joins class names', () => {
    expect(classNames('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsy values', () => {
    expect(classNames('a', false, null, undefined, 'b')).toBe('a b');
  });
});
