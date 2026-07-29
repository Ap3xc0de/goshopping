import { GuardResult, GuardConfig, DEFAULT_CONFIG, Threat } from './types';

// ---------------------------------------------------------------------------
// Scope rules — what can the AI generate for each request type
// ---------------------------------------------------------------------------

// Patterns that indicate backend/infra code regardless of request type
const BACKEND_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /\bexpress\b.*\bRouter\b/i, description: 'Express router (backend code)' },
  { pattern: /\bapp\.(get|post|put|delete|patch)\s*\(/i, description: 'Express route handler (backend code)' },
  { pattern: /\bknex\b|\bprisma\b|\btypeorm\b/i, description: 'ORM/query builder usage (backend code)' },
  { pattern: /\bSELECT\b.*\bFROM\b/i, description: 'Raw SQL query (backend code)' },
  { pattern: /\bINSERT\s+INTO\b/i, description: 'SQL INSERT statement (backend code)' },
  { pattern: /\bUPDATE\b.*\bSET\b/i, description: 'SQL UPDATE statement (backend code)' },
  { pattern: /\bjwt\.sign\b|\bjwt\.verify\b/i, description: 'JWT sign/verify (backend auth code)' },
  { pattern: /\bbcrypt\b/i, description: 'bcrypt usage (backend code)' },
  { pattern: /\bDockerfile\b|FROM\s+\w+:\w+/i, description: 'Dockerfile content (infrastructure code)' },
  { pattern: /\bterraform\b|\baws_\w+\b/i, description: 'Terraform/AWS resource (infrastructure code)' },
];

// Patterns allowed only in specific request types
const STYLE_JS_PATTERNS: Array<{ pattern: RegExp; description: string; severity: Threat['severity'] }> = [
  { pattern: /\bfunction\s+\w+\s*\(/, description: 'JavaScript function declaration in style', severity: 'high' },
  { pattern: /\bconst\s+\w+\s*=/, description: 'JavaScript const declaration in style', severity: 'high' },
  { pattern: /\bimport\s+/, description: 'JavaScript import in style', severity: 'high' },
];

export function validateScope(
  aiOutput: string,
  requestedType: 'component' | 'page' | 'style' | 'config',
  config: GuardConfig = DEFAULT_CONFIG,
): GuardResult {
  const threats: Threat[] = [];

  // Check for backend/infra patterns (always forbidden)
  for (const { pattern, description } of BACKEND_PATTERNS) {
    const match = pattern.exec(aiOutput);
    if (match) {
      threats.push({
        type: 'scope_violation',
        severity: 'high',
        description,
        match: match[0],
        position: match.index,
      });
    }
  }

  // Check type-specific rules
  if (requestedType === 'style') {
    for (const { pattern, description, severity } of STYLE_JS_PATTERNS) {
      const match = pattern.exec(aiOutput);
      if (match) {
        threats.push({
          type: 'scope_violation',
          severity,
          description,
          match: match[0],
          position: match.index,
        });
      }
    }
  }

  const blocked =
    config.strictMode
      ? threats.some((t) => t.severity === 'critical' || t.severity === 'high')
      : threats.some((t) => t.severity === 'critical');

  if (config.logThreats && threats.length > 0) {
    console.warn('[ScopeGuard] Threats detected:', threats.map((t) => t.description));
  }

  const topThreat = threats.find((t) => t.severity === 'critical') ?? threats[0];

  return {
    passed: !blocked,
    blocked,
    reason: blocked ? topThreat?.description : undefined,
    sanitizedContent: blocked ? undefined : aiOutput,
    threats,
  };
}
