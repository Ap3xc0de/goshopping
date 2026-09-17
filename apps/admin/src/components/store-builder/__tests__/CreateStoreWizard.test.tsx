import { render, screen, fireEvent } from '@testing-library/react';
import { CreateStoreWizard } from '../CreateStoreWizard';

jest.mock('../TemplateGalleryStep', () => ({
  TemplateGalleryStep: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button data-testid="stub-select-template" onClick={() => onSelect('vibrant')}>
      select template
    </button>
  ),
}));

/**
 * REQ-ADMIN-01 — this is the skeleton commit (PR 8a): steps 2 and 3 are
 * lightweight placeholders here. They are replaced by the real
 * BrandingStep/DomainStep in PR 8b, at which point this test file is
 * updated to assert against those instead of the placeholder testids.
 */
describe('CreateStoreWizard (skeleton)', () => {
  it('renders step 1 (template gallery) on initial mount', () => {
    render(<CreateStoreWizard />);
    expect(screen.getByTestId('stub-select-template')).toBeInTheDocument();
  });

  it('advances to step 2 after a template is selected in step 1', () => {
    render(<CreateStoreWizard />);
    fireEvent.click(screen.getByTestId('stub-select-template'));
    expect(screen.getByTestId('wizard-step-2-placeholder')).toBeInTheDocument();
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
