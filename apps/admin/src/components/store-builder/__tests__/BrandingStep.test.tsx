import { render, screen, fireEvent } from '@testing-library/react';
import { BrandingStep } from '../BrandingStep';

/**
 * REQ-ADMIN-03 — reuses the existing ColorPicker.tsx WITHOUT changing its
 * public contract (still `onSelect: (colors: { primary, secondary? }) => void`).
 *
 * MAPPING DECISION (pending product confirmation — see apply-progress for
 * this slice, sdd/storefront-templates-multidomain/apply-progress):
 * ColorPicker only ever returns 2 of the 9 HSL fields BrandColors has.
 * primary -> colors.primary (unambiguous). secondary -> colors.background,
 * because in ColorPicker's own PALETTES every "secondary" value is a light
 * neutral tone meant for surfaces, not a text/foreground accent. The other
 * 7 HSL fields (primary_foreground, secondary_foreground, accent,
 * accent_foreground, foreground, muted) are left untouched (undefined) so
 * the backend (branding.go, all fields `omitempty`) falls back to the
 * template manifest's defaults instead of being overwritten with "".
 */
describe('BrandingStep', () => {
  it('renders the shared ColorPicker for palette selection', () => {
    render(<BrandingStep onConfirm={jest.fn()} />);
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('maps ColorPicker primary/secondary to colors.primary/colors.background, leaving the other 7 HSL fields untouched', () => {
    const onConfirm = jest.fn();
    render(<BrandingStep onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId('palette-Azul Marino'));
    fireEvent.click(screen.getByTestId('branding-confirm-btn'));

    expect(onConfirm).toHaveBeenCalledWith({
      colors: { primary: '221 83% 53%', background: '221 33% 97%' },
      fonts: { heading: undefined, body: undefined },
    });
  });

  it('rejects a font not in the AllowedFonts whitelist before submit (client-side pre-check)', () => {
    const onConfirm = jest.fn();
    render(<BrandingStep onConfirm={onConfirm} />);

    fireEvent.change(screen.getByTestId('font-heading-input'), {
      target: { value: 'Comic Sans' },
    });
    fireEvent.click(screen.getByTestId('branding-confirm-btn'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('font-error')).toHaveTextContent('Comic Sans');
  });

  // CATALOG-03/ADMIN-05 (Slice 9): the wizard's Marca step is a quick
  // first-time setup, not the full editor — it should point users to
  // "Mi Tienda" (apps/admin/src/app/dashboard/my-store) for the complete
  // set of colors/fonts/radius controls.
  it('links to Mi Tienda for full branding customization', () => {
    render(<BrandingStep onConfirm={jest.fn()} />);
    const link = screen.getByRole('link', { name: /Mi Tienda/i });
    expect(link).toHaveAttribute('href', '/dashboard/my-store');
  });

  it('accepts a whitelisted font and includes it in the confirmed branding', () => {
    const onConfirm = jest.fn();
    render(<BrandingStep onConfirm={onConfirm} />);

    fireEvent.change(screen.getByTestId('font-heading-input'), {
      target: { value: 'Poppins' },
    });
    fireEvent.click(screen.getByTestId('branding-confirm-btn'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ fonts: expect.objectContaining({ heading: 'Poppins' }) }),
    );
  });
});
