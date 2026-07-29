/**
 * Tests the IVA (19%) calculation logic used in NewOrderPage.
 * The page uses calculateTax(subtotal) from @/lib/utils.
 */
import { calculateTax } from '@/lib/utils';

describe('New order IVA calculation', () => {
  it('applies 19% IVA to subtotal', () => {
    expect(calculateTax(100000)).toBe(19000);
    expect(calculateTax(50000)).toBe(9500);
    expect(calculateTax(0)).toBe(0);
  });

  it('total = subtotal + IVA', () => {
    const subtotal = 200000;
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;
    expect(total).toBe(238000);
  });

  it('IVA is computed correctly for multiple items', () => {
    // Simulate 3 items: 2×$45,000 + 1×$30,000 = $120,000 subtotal
    const cart = [
      { price: 45000, quantity: 2 },
      { price: 30000, quantity: 1 },
    ];
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    expect(subtotal).toBe(120000);
    expect(calculateTax(subtotal)).toBe(22800);
    expect(subtotal + calculateTax(subtotal)).toBe(142800);
  });
});
