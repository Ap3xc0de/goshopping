import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateStoreWizard } from '../CreateStoreWizard';
import { api } from '@/lib/api';
import { useStore } from '@/lib/hooks/useStore';

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/api', () => ({
  api: {
    updateBranding: jest.fn(),
    getStoreDomain: jest.fn(),
  },
}));

jest.mock('../BrandingStep', () => ({
  BrandingStep: ({ onConfirm }: { onConfirm: (b: unknown) => void }) => (
    <button
      data-testid="stub-confirm-branding"
      onClick={() => onConfirm({ colors: { primary: '221 83% 53%' }, fonts: {} })}
    >
      confirm branding
    </button>
  ),
}));
jest.mock('../DomainStep', () => ({
  DomainStep: ({ hostname }: { hostname: string | null }) => (
    <div data-testid="stub-domain-step">{hostname ?? 'pending'}</div>
  ),
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

/**
 * CATALOG-03/ADMIN-05 (Slice 9) — the wizard drops step 1 (template
 * gallery): `minimal` is the only active template (CATALOG-01) and its
 * migration 008 DB default already assigns every new store to it, so the
 * wizard never needs to call PUT /stores/:storeId/template at all (fewer
 * moving parts than keeping a call hardcoded to 'minimal').
 */
describe('CreateStoreWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
    (api.updateBranding as jest.Mock).mockResolvedValue({});
    (api.getStoreDomain as jest.Mock).mockResolvedValue({ hostname: null });
  });

  it('renders step 1 (branding) on initial mount, with no template gallery step', () => {
    render(<CreateStoreWizard />);
    expect(screen.getByTestId('stub-confirm-branding')).toBeInTheDocument();
    expect(screen.queryByTestId('template-gallery-step')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stub-select-template')).not.toBeInTheDocument();
  });

  it('only has 2 steps in the stepper: Marca and Dominio', () => {
    render(<CreateStoreWizard />);
    const stepper = screen.getByTestId('wizard-stepper');
    expect(stepper).toHaveTextContent('1. Marca');
    expect(stepper).toHaveTextContent('2. Dominio');
    expect(stepper).not.toHaveTextContent('Plantilla');
  });

  it('advances to step 2 (domain) after branding is confirmed, persisting only branding (no template_id call)', async () => {
    render(<CreateStoreWizard />);
    fireEvent.click(screen.getByTestId('stub-confirm-branding'));

    await waitFor(() => expect(screen.getByTestId('stub-domain-step')).toBeInTheDocument());

    expect(api.updateBranding).toHaveBeenCalledWith('store-1', {
      colors: { primary: '221 83% 53%' },
      fonts: {},
    });
    expect((api as unknown as { updateStoreTemplate?: unknown }).updateStoreTemplate).toBeUndefined();
  });

  it('shows an error and stays on step 1 when persisting fails', async () => {
    (api.updateBranding as jest.Mock).mockRejectedValue(new Error('invalid HSL'));
    render(<CreateStoreWizard />);
    fireEvent.click(screen.getByTestId('stub-confirm-branding'));

    await waitFor(() => expect(screen.getByTestId('wizard-error')).toBeInTheDocument());
    expect(screen.getByTestId('stub-confirm-branding')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-domain-step')).not.toBeInTheDocument();
  });

  it('does not render any ChatAssistant/GenerationProgress/ChatMessage component', () => {
    render(<CreateStoreWizard />);
    expect(screen.queryByTestId('chat-assistant')).not.toBeInTheDocument();
    expect(screen.queryByTestId('generation-progress')).not.toBeInTheDocument();
    expect(screen.queryByTestId('completion-section')).not.toBeInTheDocument();
  });

  it('highlights the current step in the stepper', async () => {
    render(<CreateStoreWizard />);
    expect(screen.getByTestId('wizard-step-1').className).toMatch(/text-brand-700/);
    fireEvent.click(screen.getByTestId('stub-confirm-branding'));
    await waitFor(() =>
      expect(screen.getByTestId('wizard-step-2').className).toMatch(/text-brand-700/),
    );
  });
});
