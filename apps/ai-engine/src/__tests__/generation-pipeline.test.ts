import { GenerationPipeline, StoreGenerationRequest } from '../services/generation-pipeline';
import { ClaudeClient } from '../services/claude-client';

jest.mock('../services/claude-client');
const MockedClaude = ClaudeClient as jest.MockedClass<typeof ClaudeClient>;

const SAMPLE_TSX = `
import React from 'react';
import { Navbar } from '@/components/design-system/layout/Navbar';

export default function HomePage() {
  return (
    <main>
      <Navbar variant="solid" storeName="Test" cartItemCount={0} />
      <h1>Hello Store</h1>
    </main>
  );
}
`.trim();

const SAMPLE_REQUEST: StoreGenerationRequest = {
  storeConfig: {
    name: 'Mi Tienda',
    category: 'moda',
    style: 'minimal',
    colors: { primary: '220 14% 96%', secondary: '220 9% 46%', accent: '262 83% 57%' },
    pages: ['inicio', 'catalogo'],
  },
  storeSlug: 'mi-tienda',
  storeId: 'store-001',
};

function makeMockClaude(response = SAMPLE_TSX): ClaudeClient {
  const instance = new MockedClaude() as jest.Mocked<ClaudeClient>;
  instance.generate = jest.fn().mockResolvedValue(response);
  instance.chat = jest.fn().mockResolvedValue(response);
  return instance;
}

describe('GenerationPipeline', () => {
  beforeEach(() => MockedClaude.mockClear());

  it('generates pages for a valid store config', async () => {
    const pipeline = new GenerationPipeline(makeMockClaude());
    const result = await pipeline.generateStore(SAMPLE_REQUEST);
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.pages[0].name).toBe('HomePage');
  });

  it('includes SECURITY_RULES in the system prompt sent to Claude', async () => {
    const mock = makeMockClaude();
    const pipeline = new GenerationPipeline(mock);
    await pipeline.generateStore(SAMPLE_REQUEST);

    const calls = (mock.generate as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const systemPrompt: string = calls[0][0].systemPrompt;
    expect(systemPrompt).toContain('NUNCA'); // From SECURITY_RULES
  });

  it('passes output through guards before returning', async () => {
    const pipeline = new GenerationPipeline(makeMockClaude());
    const result = await pipeline.generateStore(SAMPLE_REQUEST);
    // All returned pages should be validated
    for (const page of result.pages) {
      expect(typeof page.validated).toBe('boolean');
    }
  });

  it('blocks pages with code injection in generated output', async () => {
    // Simulate Claude returning dangerous code
    const dangerousCode = `
      import { exec } from 'child_process';
      exec('rm -rf /');
    `;
    const mock = makeMockClaude(dangerousCode);
    const pipeline = new GenerationPipeline(mock);
    const result = await pipeline.generateStore(SAMPLE_REQUEST);

    // The blocked page should appear in errors, not pages
    const hasBlockedError = result.errors.some((e) => e.includes('blocked'));
    expect(hasBlockedError || result.pages.every((p) => p.validated === false)).toBeTruthy();
  });

  it('generates correct CSS variables for each style', () => {
    const pipeline = new GenerationPipeline(makeMockClaude());
    const config = { ...SAMPLE_REQUEST.storeConfig, style: 'elegant' };

    const vars = pipeline.buildCSSVariables(config);
    expect(vars['--brand-primary']).toBe(config.colors.primary);
    expect(vars['--font-heading']).toBe('Cormorant Garamond');
    expect(vars['--font-body']).toBe('Lato');
  });

  it('handles Claude error gracefully', async () => {
    const mock = makeMockClaude();
    (mock.generate as jest.Mock).mockRejectedValue(new Error('API unavailable'));
    const pipeline = new GenerationPipeline(mock);
    const result = await pipeline.generateStore(SAMPLE_REQUEST);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('API unavailable');
  });

  it('generates only the pages requested', async () => {
    const pipeline = new GenerationPipeline(makeMockClaude());
    const requestWithAbout: StoreGenerationRequest = {
      ...SAMPLE_REQUEST,
      storeConfig: { ...SAMPLE_REQUEST.storeConfig, pages: ['inicio', 'catalogo', 'about'] },
    };
    const result = await pipeline.generateStore(requestWithAbout);
    const pageNames = result.pages.map((p) => p.name);

    // AboutPage should be included
    expect(pageNames).toContain('AboutPage');
    // ContactPage should NOT be included
    expect(pageNames).not.toContain('ContactPage');
  });
});
