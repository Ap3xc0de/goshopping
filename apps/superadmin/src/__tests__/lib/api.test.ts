import { ApiError } from '@/lib/api';

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError(404, 'not_found', 'Not found');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('exposes status and code', () => {
    const err = new ApiError(401, 'unauthorized', 'Unauthorized');
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
    expect(err.message).toBe('Unauthorized');
    expect(err.name).toBe('ApiError');
  });
});
