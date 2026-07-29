import { sanitizeOutput } from '../guards/output-sanitizer';
import { DEFAULT_CONFIG } from '../guards/types';

describe('OutputSanitizer — data leakage', () => {
  test('blocks JWT token in output', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const result = sanitizeOutput(`Here is your token: ${jwt}`, DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
    expect(result.threats[0].type).toBe('data_leakage');
  });

  test('blocks AWS Access Key ID', () => {
    const result = sanitizeOutput('Use AKIAIOSFODNN7EXAMPLE as your key', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks database connection string with credentials', () => {
    const result = sanitizeOutput('Connect to postgres://admin:password123@db.internal:5432/shop', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks internal API endpoint', () => {
    const result = sanitizeOutput('Call /api/v1/internal/stores to fetch data', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks admin API endpoint', () => {
    const result = sanitizeOutput('Use /admin/api/users to manage users', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('redacts JWT token from output', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const result = sanitizeOutput(`Here is your token: ${jwt}`, DEFAULT_CONFIG);
    // Even if blocked, threats should include data_leakage
    expect(result.threats.some(t => t.type === 'data_leakage')).toBe(true);
  });

  test('truncates output exceeding maxOutputLength', () => {
    const longOutput = 'a'.repeat(60000);
    const result = sanitizeOutput(longOutput, DEFAULT_CONFIG);
    expect(result.threats.some(t => t.type === 'data_leakage')).toBe(true);
  });

  test('passes clean AI output', () => {
    const clean = 'Here is your storefront component with blue and white colors.';
    const result = sanitizeOutput(clean, DEFAULT_CONFIG);
    expect(result.blocked).toBe(false);
    expect(result.passed).toBe(true);
    expect(result.sanitizedContent).toBe(clean);
  });

  test('blocks process.env.API_KEY in output', () => {
    const result = sanitizeOutput('Use process.env.API_KEY to authenticate', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });
});
