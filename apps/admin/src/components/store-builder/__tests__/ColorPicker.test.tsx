import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from '../ColorPicker';
import { isValidHslString } from '@/lib/color';

/**
 * Bug fix (found in Slice 8, fixed in Slice 9): `handleCustom` used to pass
 * the raw hex string straight to `onSelect({ primary: customHex })`, but
 * every other caller of `onSelect` (palette buttons, BrandingStep, Go's
 * BrandColors) expects an "H S% L%" HSL string, not "#rrggbb". A raw hex
 * value there would fail `validateHSL` server-side (branding.go) the first
 * time a user typed a custom color.
 */
describe('ColorPicker custom hex input', () => {
  it('emits a valid HSL string (not raw hex) when a custom hex is confirmed', () => {
    const onSelect = jest.fn();
    render(<ColorPicker onSelect={onSelect} />);

    fireEvent.change(screen.getByTestId('custom-hex-input'), {
      target: { value: '#ff0000' },
    });
    fireEvent.click(screen.getByText('Usar'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const [{ primary }] = onSelect.mock.calls[0];
    expect(primary).not.toMatch(/^#/);
    expect(isValidHslString(primary)).toBe(true);
  });

  it('ignores an invalid custom hex (does not call onSelect)', () => {
    const onSelect = jest.fn();
    render(<ColorPicker onSelect={onSelect} />);

    fireEvent.change(screen.getByTestId('custom-hex-input'), {
      target: { value: 'not-a-hex' },
    });
    fireEvent.click(screen.getByText('Usar'));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
