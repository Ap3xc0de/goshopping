import { render, screen } from '@testing-library/react';
import CreateStorePage from '../page';

jest.mock('@/components/store-builder/CreateStoreWizard', () => ({
  CreateStoreWizard: () => <div data-testid="stub-wizard" />,
}));

describe('CreateStorePage', () => {
  it('mounts the 3-step wizard', () => {
    render(<CreateStorePage />);
    expect(screen.getByTestId('stub-wizard')).toBeInTheDocument();
  });

  it('does not render the old AI chat assistant', () => {
    render(<CreateStorePage />);
    expect(screen.queryByTestId('chat-assistant')).not.toBeInTheDocument();
  });
});
