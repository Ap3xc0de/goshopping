import { ClaudeClient } from '../services/claude-client';

// This test verifies ClaudeClient structure without making real API calls
// Real integration tests would require ANTHROPIC_API_KEY in CI

describe('ClaudeClient', () => {
  it('instantiates without throwing when no API key (test env)', () => {
    expect(() => new ClaudeClient('test-key')).not.toThrow();
  });

  it('has generate method', () => {
    const client = new ClaudeClient('test-key');
    expect(typeof client.generate).toBe('function');
  });

  it('has chat method', () => {
    const client = new ClaudeClient('test-key');
    expect(typeof client.chat).toBe('function');
  });

  it('generate throws when called without real API key in test env', async () => {
    const client = new ClaudeClient('sk-invalid-test-key');
    await expect(
      client.generate({
        systemPrompt: 'test',
        userMessage: 'test',
        maxTokens: 10,
      }),
    ).rejects.toThrow();
  });
});
