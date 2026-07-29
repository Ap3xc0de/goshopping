import { GuardPipeline, GuardResult } from '../guards';
import { SystemPromptBuilder } from '../prompts/system-prompt';
import { buildStoreGenerationPrompt } from '../prompts/store-generator';
import { ClaudeClient } from './claude-client';
import { Threat } from '../guards/types';

export interface StoreGenerationRequest {
  storeConfig: {
    name: string;
    category: string;
    style: string;
    colors: { primary: string; secondary?: string; accent?: string };
    tagline?: string;
    logo_url?: string | null;
    pages: string[];
  };
  storeSlug: string;
  storeId: string;
}

export interface GeneratedPage {
  name: string;
  code: string;
  validated: boolean;
}

export interface StoreGenerationResult {
  success: boolean;
  pages: GeneratedPage[];
  cssVariables: Record<string, string>;
  errors: string[];
  threats: Threat[];
}

const FONT_MAP: Record<string, { heading: string; body: string }> = {
  minimal: { heading: 'Playfair Display', body: 'Inter' },
  vibrant: { heading: 'Montserrat', body: 'Roboto' },
  elegant: { heading: 'Cormorant Garamond', body: 'Lato' },
  urban: { heading: 'Bebas Neue', body: 'Space Grotesk' },
  fresh: { heading: 'Nunito', body: 'Open Sans' },
};

export class GenerationPipeline {
  private claude: ClaudeClient;
  private guards: GuardPipeline;
  private promptBuilder: SystemPromptBuilder;

  constructor(claude?: ClaudeClient) {
    this.claude = claude ?? new ClaudeClient();
    this.guards = new GuardPipeline({ strictMode: true });
    this.promptBuilder = new SystemPromptBuilder();
  }

  async generateStore(request: StoreGenerationRequest): Promise<StoreGenerationResult> {
    const result: StoreGenerationResult = {
      success: false,
      pages: [],
      cssVariables: {},
      errors: [],
      threats: [],
    };

    // 1. Select skills & context docs
    const skills = this.promptBuilder.selectSkills('store');
    const contextDocs = this.promptBuilder.selectContextDocs('store');

    // 2. Build system prompt
    const systemPrompt = this.promptBuilder.buildSystemPrompt({
      skills,
      contextDocs,
      storeConfig: {
        name: request.storeConfig.name,
        category: request.storeConfig.category,
        style: request.storeConfig.style,
        template: request.storeConfig.style,
        colors: request.storeConfig.colors,
        tagline: request.storeConfig.tagline,
      },
      requestType: 'store',
    });

    // 3. Determine pages to generate
    const pageNames = ['HomePage', 'CatalogPage', 'ProductPage', 'CheckoutPage'];
    if (request.storeConfig.pages.includes('about')) pageNames.push('AboutPage');
    if (request.storeConfig.pages.includes('contact')) pageNames.push('ContactPage');
    if (request.storeConfig.pages.includes('faq')) pageNames.push('FAQPage');

    // 4. Generate each page sequentially
    for (const pageName of pageNames) {
      try {
        const userPrompt = buildStoreGenerationPrompt({
          name: request.storeConfig.name,
          slug: request.storeSlug,
          category: request.storeConfig.category,
          style: request.storeConfig.style,
          template: request.storeConfig.style,
          tagline: request.storeConfig.tagline,
          colors: request.storeConfig.colors,
        });

        // 4a. Guard: validate input prompt
        const inputGuard = this.guards.validateInput(userPrompt);
        if (inputGuard.blocked) {
          result.errors.push(`Input blocked for ${pageName}: ${inputGuard.reason}`);
          result.threats.push(...inputGuard.threats);
          continue;
        }

        // 4b. Call Claude
        const generatedCode = await this.claude.generate({
          systemPrompt,
          userMessage: `${userPrompt}\n\nGenera el componente: ${pageName}`,
          maxTokens: 4096,
          temperature: 0.5,
        });

        // 4c. Guard: validate output
        const outputGuard = this.guards.validateOutput(generatedCode);
        const cleanCode = outputGuard.sanitizedContent ?? generatedCode;

        // 4d. Guard: validate code
        const codeGuard = this.guards.validateCode(cleanCode, 'tsx');

        if (codeGuard.blocked) {
          result.errors.push(`Code blocked for ${pageName}: ${codeGuard.reason}`);
          result.threats.push(...codeGuard.threats);
          continue;
        }

        result.pages.push({
          name: pageName,
          code: codeGuard.sanitizedContent ?? cleanCode,
          validated: codeGuard.passed && outputGuard.passed,
        });

        result.threats.push(...outputGuard.threats, ...codeGuard.threats);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Error generating ${pageName}: ${message}`);
      }
    }

    // 5. Build CSS variables
    result.cssVariables = this.buildCSSVariables(request.storeConfig);

    result.success = result.pages.length > 0 && result.errors.length === 0;
    return result;
  }

  buildCSSVariables(
    config: StoreGenerationRequest['storeConfig'],
  ): Record<string, string> {
    const fonts = FONT_MAP[config.style] ?? FONT_MAP.minimal;
    return {
      '--brand-primary': config.colors.primary,
      '--brand-secondary': config.colors.secondary ?? 'auto',
      '--brand-accent': config.colors.accent ?? 'auto',
      '--font-heading': fonts.heading,
      '--font-body': fonts.body,
    };
  }
}
