import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateStoreWizard } from '../CreateStoreWizard';
import { api } from '@/lib/api';
import { useStore } from '@/lib/hooks/useStore';

jest.mock('@/lib/hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('@/lib/api', () => ({
  api: {
    updateStoreTemplate: jest.fn(),
    updateBranding: jest.fn(),
  },
}));

jest.mock('../TemplateGalleryStep', () => ({
  TemplateGalleryStep: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button data-testid="stub-select-template" onClick={() => onSelect('vibrant')}>
      select template
    </button>
  ),
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

describe('CreateStoreWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue({ storeId: 'store-1', storeName: 'Tienda', stores: [] });
    (api.updateStoreTemplate as jest.Mock).mockResolvedValue({ template_id: 'vibrant' });
    (api.updateBranding as jest.Mock).mockResolvedValue({});
  });

  it('renders step 1 (template gallery) on initial mount', () => {
    render(<CreateStoreWizard />);
    expect(screen.getByTestId('stub-select-template')).toBeInTheDocument();
  });

  it('advances to step 2 (branding) after a template is selected in step 1', () => {
    render(<CreateStoreWizard />);
    fireEvent.click(screen.getByTestId('stub-select-template'));
    expect(screen.getByTestId('stub-confirm-branding')).toBeInTheDocument();
  });

  it('advances to step 3 (domain) after branding is confirmed, persisting template + branding', async () => {
    render(<CreateStoreWizard />);
    fireEvent.click(screen.getByTestId('stub-select-template'));
    fireEvent.click(screen.getByTestId('stub-confirm-branding'));

    await waitFor(() => expect(screen.getByTestId('stub-domain-step')).toBeInTheDocument());

    expect(api.updateStoreTemplate).toHaveBeenCalledWith('store-1', 'vibrant');
    expect(api.updateBranding).toHaveBeenCalledWith('store-1', {
      colors: { primary: '221 83% 53%' },
      fonts: {},
    });
  });

  it('shows an error and stays on step 2 when persisting fails', async () => {
    (api.updateStoreTemplate as jest.Mock).mockRejectedValue(new Error('unknown template_id'));
    render(<CreateStoreWizard />);
    fireEvent.click(screen.getByTestId('stub-select-template'));
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

  it('highlights the current step in the stepper', () => {
    render(<CreateStoreWizard />);
    expect(screen.getByTestId('wizard-step-1').className).toMatch(/text-brand-700/);
    fireEvent.click(screen.getByTestId('stub-select-template'));
    expect(screen.getByTestId('wizard-step-2').className).toMatch(/text-brand-700/);
  });
});
