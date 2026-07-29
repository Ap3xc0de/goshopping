import { GuardResult, GuardConfig, DEFAULT_CONFIG, Threat } from './types';
import { CODE_BLOCKED_PATTERNS } from './keyword-blocklist';
import { extractUrls, isUrlAllowed } from './url-whitelist';

// ---------------------------------------------------------------------------
// Language-specific additional patterns
// ---------------------------------------------------------------------------

const TSX_EXTRA_PATTERNS: Array<{ pattern: RegExp; description: string; severity: Threat['severity'] }> = [
  {
    pattern: /dangerouslySetInnerHTML/,
    description: 'dangerouslySetInnerHTML usage is prohibited',
    severity: 'high',
  },
  {
    pattern: /\bwindow\.__proto__/,
    description: 'Prototype pollution attempt',
    severity: 'critical',
  },
];

const CSS_EXTRA_PATTERNS: Array<{ pattern: RegExp; description: string; severity: Threat['severity'] }> = [
  {
    // CSS expression() — old IE attack
    pattern: /expression\s*\(/i,
    description: 'CSS expression() is prohibited',
    severity: 'high',
  },
  {
    // CSS url() pointing outside allowed domains
    pattern: /url\(\s*['"]?(https?:\/\/[^'")]+)['"]?\s*\)/i,
    description: 'CSS url() with external resource',
    severity: 'medium',
  },
];

// ---------------------------------------------------------------------------
// Validate generated code
// ---------------------------------------------------------------------------

export function validateCode(
  code: string,
  language: 'tsx' | 'css' | 'json',
  config: GuardConfig = DEFAULT_CONFIG,
): GuardResult {
  const threats: Threat[] = [];

  // Common blocked patterns (apply to all languages)
  for (const { pattern, description, severity } of CODE_BLOCKED_PATTERNS) {
    const match = pattern.exec(code);
    if (match) {
      threats.push({
        type: 'code_injection',
        severity,
        description,
        match: match[0],
        position: match.index,
      });
    }
  }

  if (language === 'tsx') {
    // TSX-specific checks
    for (const { pattern, description, severity } of TSX_EXTRA_PATTERNS) {
      const match = pattern.exec(code);
      if (match) {
        threats.push({
          type: 'code_injection',
          severity,
          description,
          match: match[0],
          position: match.index,
        });
      }
    }

    // URL whitelist check for fetch calls and src attributes
    const urls = extractUrls(code);
    for (const url of urls) {
      if (!isUrlAllowed(url)) {
        threats.push({
          type: 'code_injection',
          severity: 'high',
          description: `URL not in whitelist: ${url}`,
          match: url,
        });
      }
    }
  }

  if (language === 'css') {
    for (const { pattern, description, severity } of CSS_EXTRA_PATTERNS) {
      const match = pattern.exec(code);
      if (match) {
        // For CSS url(), check if it's allowed
        if (description.includes('url()')) {
          const urlMatch = /url\(\s*['"]?(https?:\/\/[^'")]+)['"]?\s*\)/i.exec(code);
          if (urlMatch && !isUrlAllowed(urlMatch[1])) {
            threats.push({
              type: 'code_injection',
              severity,
              description: `CSS url() points to non-whitelisted domain: ${urlMatch[1]}`,
              match: urlMatch[0],
              position: urlMatch.index,
            });
          }
        } else {
          threats.push({
            type: 'code_injection',
            severity,
            description,
            match: match[0],
            position: match.index,
          });
        }
      }
    }
  }

  if (language === 'json') {
    // JSON validation — must be valid JSON
    try {
      JSON.parse(code);
    } catch {
      threats.push({
        type: 'code_injection',
        severity: 'medium',
        description: 'Generated JSON is not valid',
        match: code.substring(0, 60),
      });
    }
  }

  const blocked =
    config.strictMode
      ? threats.some((t) => t.severity === 'critical' || t.severity === 'high')
      : threats.some((t) => t.severity === 'critical');

  if (config.logThreats && threats.length > 0) {
    console.warn('[CodeValidator] Threats detected:', threats.map((t) => t.description));
  }

  const topThreat = threats.find((t) => t.severity === 'critical') ?? threats[0];

  return {
    passed: !blocked,
    blocked,
    reason: blocked ? topThreat?.description : undefined,
    sanitizedContent: blocked ? undefined : code,
    threats,
  };
}
