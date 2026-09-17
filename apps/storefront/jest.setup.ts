import '@testing-library/jest-dom';

// This setup file runs for every test file regardless of its
// `@jest-environment` docblock — middleware.test.ts opts into the `node`
// environment (Edge middleware has no DOM), so DOM-only polyfills below must
// be guarded instead of assuming `window` exists.
if (typeof window !== 'undefined') {
  // Polyfill ResizeObserver for Radix UI components
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Polyfill window.matchMedia for components that check viewport
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
