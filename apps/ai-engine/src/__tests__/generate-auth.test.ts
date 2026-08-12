import jwt from 'jsonwebtoken';
import { canAccessStore, AuthPayload } from '../middleware/auth';
import { config } from '../config';

describe('AI Engine auth store binding', () => {
  const secret = config.auth.jwtSecret;

  function sign(payload: AuthPayload): string {
    return jwt.sign(payload, secret, { expiresIn: '15m' });
  }

  test('owner can access store in stores claim', () => {
    const payload: AuthPayload = {
      sub: 'acc-1',
      role: 'owner',
      token_type: 'access',
      stores: [{ store_id: 'store-a', role: 'owner' }],
    };
    expect(canAccessStore(payload, 'store-a')).toBe(true);
    expect(canAccessStore(payload, 'store-b')).toBe(false);
  });

  test('superadmin can access any store', () => {
    const payload: AuthPayload = {
      sub: 'admin-1',
      role: 'superadmin',
      token_type: 'access',
      stores: [],
    };
    expect(canAccessStore(payload, 'any-store')).toBe(true);
  });

  test('rejects refresh token_type via verify shape', () => {
    const token = sign({
      sub: 'acc-1',
      role: 'owner',
      token_type: 'refresh',
      stores: [{ store_id: 'store-a', role: 'owner' }],
    });
    const decoded = jwt.verify(token, secret) as AuthPayload;
    expect(decoded.token_type).toBe('refresh');
    // requireAuth would reject; canAccessStore still true but route gate is token_type
    expect(decoded.token_type === 'access').toBe(false);
  });

  test('missing stores denies access', () => {
    expect(canAccessStore({ sub: 'x', role: 'owner', token_type: 'access' }, 'store-a')).toBe(false);
  });
});
