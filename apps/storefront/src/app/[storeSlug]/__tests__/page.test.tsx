/**
 * W4 (hardening slice 10): characterization test pinning the home page's
 * `useProducts` call to `{ per_page: 8 }`. Historically this was
 * `{ limit: 8 }` (commit 368763d fixed it) — Go's `ListProducts` only ever
 * reads `per_page`, so `limit` was silently ignored and the homepage never
 * actually capped to 8 products. This test is a regression guard: if
 * someone reintroduces `limit`, it fails immediately instead of only
 * surfacing as "too many products on the homepage" in manual QA.
 */
import { render } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useParams: () => ({ storeSlug: 'tienda-test' }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { useProducts } from '@goshopping/storefront-sdk';
import StorefrontHomePage from '../page';

const mockUseProducts = useProducts as jest.MockedFunction<typeof useProducts>;

describe('[storeSlug] home page', () => {
  it('calls useProducts with { per_page: 8 }, never "limit"', () => {
    render(<StorefrontHomePage />);

    expect(mockUseProducts).toHaveBeenCalledWith('tienda-test', { per_page: 8 });

    const callArgs = mockUseProducts.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('limit');
  });
});
