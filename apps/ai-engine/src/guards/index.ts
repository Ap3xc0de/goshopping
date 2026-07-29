import { GuardResult, GuardConfig, DEFAULT_CONFIG } from './types';
import { validatePromptInjection } from './prompt-injection';
import { sanitizeOutput } from './output-sanitizer';
import { validateCode } from './code-validator';
import { validateScope } from './scope-guard';

export { validatePromptInjection } from './prompt-injection';
export { sanitizeOutput } from './output-sanitizer';
export { validateCode } from './code-validator';
export { validateScope } from './scope-guard';
export { isUrlAllowed, extractUrls, ALLOWED_DOMAINS } from './url-whitelist';
export { BLOCKED_KEYWORDS, CODE_BLOCKED_PATTERNS } from './keyword-blocklist';
export type { GuardResult, Threat, GuardConfig } from './types';
export { DEFAULT_CONFIG } from './types';

export class GuardPipeline {
  private readonly config: GuardConfig;

  constructor(config: Partial<GuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Validate INPUT from the user BEFORE sending to the AI */
  validateInput(userInput: string): GuardResult {
    return validatePromptInjection(userInput, this.config);
  }

  /** Validate OUTPUT from the AI BEFORE showing it to the user */
  validateOutput(aiOutput: string): GuardResult {
    return sanitizeOutput(aiOutput, this.config);
  }

  /** Validate GENERATED CODE before using it in build */
  validateCode(code: string, language: 'tsx' | 'css' | 'json'): GuardResult {
    return validateCode(code, language, this.config);
  }

  /** Validate SCOPE of AI output against the requested type */
  validateScope(
    aiOutput: string,
    requestedType: 'component' | 'page' | 'style' | 'config',
  ): GuardResult {
    return validateScope(aiOutput, requestedType, this.config);
  }

  /** Run the full pipeline: input → output → code */
  async runFullPipeline(
    userInput: string,
    aiOutput: string,
    generatedCode?: string,
  ): Promise<GuardResult> {
    // 1. Validate input
    const inputResult = this.validateInput(userInput);
    if (inputResult.blocked) {
      return inputResult;
    }

    // 2. Validate output
    const outputResult = this.validateOutput(aiOutput);
    if (outputResult.blocked) {
      return outputResult;
    }

    // 3. Validate generated code if present
    if (generatedCode !== undefined && generatedCode !== '') {
      // Detect language from code heuristic
      const lang = detectLanguage(generatedCode);
      const codeResult = this.validateCode(generatedCode, lang);
      if (codeResult.blocked) {
        return codeResult;
      }
    }

    // All passed — merge threats
    const allThreats = [
      ...inputResult.threats,
      ...outputResult.threats,
      ...(generatedCode ? this.validateCode(generatedCode, detectLanguage(generatedCode)).threats : []),
    ];

    return {
      passed: true,
      blocked: false,
      sanitizedContent: outputResult.sanitizedContent,
      threats: allThreats,
    };
  }
}

function detectLanguage(code: string): 'tsx' | 'css' | 'json' {
  const trimmed = code.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.includes('import React') || trimmed.includes('export default') || trimmed.includes('export function') || trimmed.includes('JSX') || trimmed.includes('tsx')) return 'tsx';
  if (trimmed.includes('{') && trimmed.includes(':') && !trimmed.includes('(')) return 'css';
  return 'tsx';
}
