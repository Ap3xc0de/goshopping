import { GuardResult, GuardConfig, DEFAULT_CONFIG, Threat } from './types';

// ---------------------------------------------------------------------------
// Override instruction patterns (must match intent, not incidental words)
// ---------------------------------------------------------------------------

const OVERRIDE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // Direct override commands
  { pattern: /ignore\s+(all\s+)?previous\s+instructions?/i, description: 'Direct override: ignore previous instructions' },
  { pattern: /forget\s+(all\s+)?your\s+rules/i, description: 'Direct override: forget your rules' },
  { pattern: /disregard\s+the\s+above/i, description: 'Direct override: disregard the above' },
  { pattern: /\bnew\s+instructions?:/i, description: 'Override prefix: new instructions' },
  { pattern: /\boverride\s+system\b/i, description: 'Override: override system' },
  { pattern: /\bjailbreak\b/i, description: 'Jailbreak attempt' },
  // Role/identity change
  { pattern: /\byou\s+are\s+now\s+(a\s+)?(\w+\s+)?(AI|assistant|model|bot|GPT)/i, description: 'Identity change: you are now' },
  { pattern: /\bact\s+as\s+(a\s+)?(root|admin|superuser|unrestricted|DAN|evil|hacker)/i, description: 'Role injection: act as privileged role' },
  { pattern: /\bpretend\s+(you\s+are|to\s+be)\b/i, description: 'Role injection: pretend you are' },
  { pattern: /\bfrom\s+now\s+on\s+you\s+(will|must|should|are)\b/i, description: 'Instruction injection: from now on' },
  { pattern: /\byour\s+primary\s+function\s+is\b/i, description: 'Role override: your primary function is' },
  // Prompt extraction
  { pattern: /\bshow\s+(me\s+)?your\s+(system\s+)?prompt\b/i, description: 'Extraction: show your prompt' },
  { pattern: /\bwhat\s+are\s+your\s+instructions?\b/i, description: 'Extraction: what are your instructions' },
  { pattern: /\bprint\s+your\s+system\s+message\b/i, description: 'Extraction: print system message' },
  { pattern: /\breveal\s+your\s+rules?\b/i, description: 'Extraction: reveal your rules' },
  { pattern: /\bwhat\s+were\s+you\s+told\b/i, description: 'Extraction: what were you told' },
  { pattern: /\brepeat\s+the\s+above(\s+text)?\b/i, description: 'Extraction: repeat the above' },
  { pattern: /\becho\s+(back|the)\b/i, description: 'Extraction: echo back' },
  // Multilingual evasion
  { pattern: /ignora\s+(las\s+)?instrucciones\s+anteriores/i, description: 'Override (ES): ignora las instrucciones anteriores' },
  { pattern: /ignore\s+les\s+instructions\s+précédentes/i, description: 'Override (FR): ignore les instructions précédentes' },
  { pattern: /vergiss\s+(alle\s+)?vorherigen\s+anweisungen/i, description: 'Override (DE): vergiss vorherigen Anweisungen' },
];

// ---------------------------------------------------------------------------
// Context separator patterns — only suspicious when followed by instructions
// ---------------------------------------------------------------------------

const SEPARATOR_WITH_INSTRUCTION_PATTERN =
  /^[-=]{3,}\s*\n+.*(instruct|system|prompt|rule|command|override|ignore|forget)/im;

// ---------------------------------------------------------------------------
// XML system-block simulators + ChatML tokens
// ---------------------------------------------------------------------------

const XML_SYSTEM_TAG_PATTERN =
  /<(system|instructions?|human|assistant|prompt|context|override)[^>]*>/i;

// ChatML / special tokens
const CHATML_TOKEN_PATTERN = /<\|(im_start|im_end|system|endoftext)\|>/i;

// ---------------------------------------------------------------------------
// Roleplay separator patterns
// ---------------------------------------------------------------------------

const ROLEPLAY_PATTERN = /^(Human|Assistant|User|AI|GPT|Claude|Gemini)\s*:/im;

// ---------------------------------------------------------------------------
// Base64 followed by decode instruction
// ---------------------------------------------------------------------------

const BASE64_DECODE_PATTERN =
  /[A-Za-z0-9+/]{20,}={0,2}\s*(?:decode|atob|base64)/i;

// ---------------------------------------------------------------------------
// Padding / repetition attack — same token repeated many times
// ---------------------------------------------------------------------------

function detectRepetitionAttack(input: string): string | null {
  // Split into tokens (words), check if any token repeats 10+ times consecutively
  const words = input.trim().split(/\s+/);
  if (words.length < 10) return null;

  let maxRun = 1;
  let currentRun = 1;
  let repeatedToken = '';

  for (let i = 1; i < words.length; i++) {
    if (words[i].toLowerCase() === words[i - 1].toLowerCase()) {
      currentRun++;
      if (currentRun > maxRun) {
        maxRun = currentRun;
        repeatedToken = words[i];
      }
    } else {
      currentRun = 1;
    }
  }

  if (maxRun >= 10) {
    return repeatedToken;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Encoding tricks
// ---------------------------------------------------------------------------

const HEX_ENCODING_PATTERN = /(?:\\x[0-9a-f]{2}){8,}/i;
const UNICODE_ESCAPE_PATTERN = /(?:\\u[0-9a-f]{4}){5,}/i;

// ---------------------------------------------------------------------------
// Main guard function
// ---------------------------------------------------------------------------

export function validatePromptInjection(
  input: string,
  config: GuardConfig = DEFAULT_CONFIG,
): GuardResult {
  const threats: Threat[] = [];

  // 1. Length check
  if (input.length > config.maxInputLength) {
    threats.push({
      type: 'prompt_injection',
      severity: 'high',
      description: `Input exceeds maxInputLength (${input.length} > ${config.maxInputLength})`,
      match: `[input length: ${input.length}]`,
    });
  }

  // 2. Override patterns
  for (const { pattern, description } of OVERRIDE_PATTERNS) {
    const match = pattern.exec(input);
    if (match) {
      threats.push({
        type: 'prompt_injection',
        severity: 'critical',
        description,
        match: match[0],
        position: match.index,
      });
    }
  }

  // 3. Context separator with instruction after
  const separatorMatch = SEPARATOR_WITH_INSTRUCTION_PATTERN.exec(input);
  if (separatorMatch) {
    threats.push({
      type: 'prompt_injection',
      severity: 'high',
      description: 'Context separator followed by instruction-like content',
      match: separatorMatch[0].substring(0, 60),
      position: separatorMatch.index,
    });
  }

  // 4. XML system tags
  const xmlMatch = XML_SYSTEM_TAG_PATTERN.exec(input);
  if (xmlMatch) {
    threats.push({
      type: 'prompt_injection',
      severity: 'critical',
      description: 'XML system-block tag detected',
      match: xmlMatch[0],
      position: xmlMatch.index,
    });
  }

  // 4b. ChatML tokens
  const chatMLMatch = CHATML_TOKEN_PATTERN.exec(input);
  if (chatMLMatch) {
    threats.push({
      type: 'prompt_injection',
      severity: 'critical',
      description: 'ChatML special token detected',
      match: chatMLMatch[0],
      position: chatMLMatch.index,
    });
  }

  // 5. Roleplay separators (Human: / Assistant:)
  const roleplayMatch = ROLEPLAY_PATTERN.exec(input);
  if (roleplayMatch) {
    threats.push({
      type: 'prompt_injection',
      severity: 'high',
      description: 'Conversation roleplay separator detected',
      match: roleplayMatch[0],
      position: roleplayMatch.index,
    });
  }

  // 6. Base64 + decode
  const b64Match = BASE64_DECODE_PATTERN.exec(input);
  if (b64Match) {
    threats.push({
      type: 'prompt_injection',
      severity: 'high',
      description: 'Base64 encoded content with decode instruction',
      match: b64Match[0].substring(0, 60),
      position: b64Match.index,
    });
  }

  // 7. Hex / unicode encoding tricks
  const hexMatch = HEX_ENCODING_PATTERN.exec(input);
  if (hexMatch) {
    threats.push({
      type: 'prompt_injection',
      severity: 'medium',
      description: 'Hex encoding sequence detected',
      match: hexMatch[0].substring(0, 40),
      position: hexMatch.index,
    });
  }

  const unicodeMatch = UNICODE_ESCAPE_PATTERN.exec(input);
  if (unicodeMatch) {
    threats.push({
      type: 'prompt_injection',
      severity: 'medium',
      description: 'Unicode escape sequence padding detected',
      match: unicodeMatch[0].substring(0, 40),
      position: unicodeMatch.index,
    });
  }

  // 8. Repetition / padding attack
  const repeatedToken = detectRepetitionAttack(input);
  if (repeatedToken !== null) {
    threats.push({
      type: 'prompt_injection',
      severity: 'high',
      description: 'Token repetition padding attack detected',
      match: `"${repeatedToken}" repeated 10+ times`,
    });
  }

  // Determine block: block on any critical or high threat in strict mode,
  // or any threat in non-strict mode that is critical
  const blocked =
    config.strictMode
      ? threats.some((t) => t.severity === 'critical' || t.severity === 'high')
      : threats.some((t) => t.severity === 'critical');

  if (config.logThreats && threats.length > 0) {
    console.warn('[PromptInjectionGuard] Threats detected:', threats.map((t) => t.description));
  }

  const topThreat = threats.find((t) => t.severity === 'critical') ?? threats[0];

  return {
    passed: !blocked,
    blocked,
    reason: blocked ? topThreat?.description : undefined,
    sanitizedContent: blocked ? undefined : input,
    threats,
  };
}
