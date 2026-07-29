import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatAssistant } from '@/components/store-builder/ChatAssistant';

// Mock next/navigation (used by child components indirectly)
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/create-store',
  useRouter: () => ({ push: jest.fn() }),
}));

const mockFetch = jest.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});

afterEach(() => {
  jest.clearAllMocks();
});

// Helper to mock the session creation endpoint
function mockCreateSession(overrides = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      session_id: 'session-123',
      response: '¡Hola! Soy tu asistente de GoShopping. ¿Cómo se llama tu negocio?',
      step: 0,
      completed: false,
      ...overrides,
    }),
  });
}

// Helper to mock a message response
function mockSendMessage(overrides = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      response: '¿Qué vendes?',
      step: 1,
      completed: false,
      store_config: { name: 'Test Store' },
      ...overrides,
    }),
  });
}

describe('ChatAssistant', () => {
  it('renders with initial assistant greeting on mount', async () => {
    mockCreateSession();
    render(<ChatAssistant storeId="store-001" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Hola.*asistente.*GoShopping/i),
      ).toBeInTheDocument();
    });
  });

  it('sends user message and shows assistant response', async () => {
    mockCreateSession();
    mockSendMessage({ response: '¿Qué vendes?', step: 1 });

    render(<ChatAssistant storeId="store-001" />);
    await waitFor(() => screen.getByTestId('chat-input'));

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Mi Tienda' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('¿Qué vendes?')).toBeInTheDocument();
    });
  });

  it('shows StyleSelector when current step is style (step 3)', async () => {
    mockCreateSession({ response: '¿Qué estilo prefieres?', step: 3 });

    render(<ChatAssistant storeId="store-001" />);

    await waitFor(() => {
      // StyleSelector renders after step=3 is set; mock initial session at step 3
      expect(screen.getByTestId('style-selector')).toBeInTheDocument();
    });
  });

  it('shows ColorPicker when current step is colors (step 2)', async () => {
    mockCreateSession({ response: '¿Qué colores?', step: 2 });

    render(<ChatAssistant storeId="store-001" />);

    await waitFor(() => {
      expect(screen.getByTestId('color-picker')).toBeInTheDocument();
    });
  });

  it('shows StoreConfigSummary and generate button when completed', async () => {
    mockCreateSession();
    mockSendMessage({
      response: '¡Perfecto! Ya tengo toda la información.',
      step: 7,
      completed: true,
      store_config: { name: 'Test Store', category: 'moda', style: 'minimal' },
    });

    render(<ChatAssistant storeId="store-001" />);
    await waitFor(() => screen.getByTestId('chat-input'));

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Viste diferente' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByTestId('store-config-summary')).toBeInTheDocument();
    });

    expect(screen.getByTestId('generate-btn')).toBeInTheDocument();
  });

  it('shows GenerationProgress when generate button is clicked', async () => {
    mockCreateSession();
    mockSendMessage({
      response: '¡Perfecto!',
      step: 7,
      completed: true,
      store_config: { name: 'Test Store' },
    });

    render(<ChatAssistant storeId="store-001" />);
    await waitFor(() => screen.getByTestId('chat-input'));

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => screen.getByTestId('generate-btn'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('generate-btn'));
    });

    expect(screen.getByTestId('generation-progress')).toBeInTheDocument();
  });
});
