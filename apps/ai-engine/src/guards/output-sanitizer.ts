import { GuardResult, GuardConfig, DEFAULT_CONFIG, Threat } from './types';
import { BLOCKED_KEYWORDS } from './keyword-blocklist';

// ---------------------------------------------------------------------------
// Data leakage patterns in AI output
// ---------------------------------------------------------------------------

const DATA_LEAKAGE_PATTERNS: Array<{ pattern: RegExp; description: string; severity: Threat['severity'] }> = [
  // Internal endpoints
  {
    pattern: /\/api\/v\d+\/internal\//i,
    description: 'Internal API endpoint exposed',
    severity: 'critical',
  },
  {
    pattern: /\/admin\/api\//i,
    description: 'Admin API endpoint exposed',
    severity: 'critical',
  },
  // Architecture details
  {
    pattern: /\bRDS\b.*\.(amazonaws\.com|rds\.)/i,
    description: 'RDS database endpoint exposed',
    severity: 'critical',
  },
  {
    pattern: /\bS3\b.*bucket/i,
    description: 'S3 bucket reference exposed',
    severity: 'high',
  },
  // JWT / auth tokens
  {
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    description: 'JWT token exposed in output',
    severity: 'critical',
  },
  // AWS keys
  {
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    description: 'AWS Access Key ID exposed',
    severity: 'critical',
  },
  // Connection strings
  {
    pattern: /\b(postgres|mysql|mongodb):\/\/[^/\s]+:[^@\s]+@/i,
    description: 'Database connection string with credentials exposed',
    severity: 'critical',
  },
];

// ---------------------------------------------------------------------------
// Sanitize AI output — remove or redact sensitive content
// ---------------------------------------------------------------------------

export function sanitizeOutput(
  output: string,
  config: GuardConfig = DEFAULT_CONFIG,
): GuardResult {
  const threats: Threat[] = [];
  let sanitized = output;

  // Check max output length
  if (output.length > config.maxOutputLength) {
    threats.push({
      type: 'data_leakage',
      severity: 'medium',
      description: `Output exceeds maxOutputLength (${output.length} > ${config.maxOutputLength})`,
      match: `[output length: ${output.length}]`,
    });
    sanitized = sanitized.substring(0, config.maxOutputLength);
  }

  // Check data leakage patterns
  for (const { pattern, description, severity } of DATA_LEAKAGE_PATTERNS) {
    const match = pattern.exec(sanitized);
    if (match) {
      threats.push({
        type: 'data_leakage',
        severity,
        description,
        match: match[0],
        position: match.index,
      });
      // Redact the match
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
  }

  // Check blocked keywords in output
  for (const { pattern, description, severity } of BLOCKED_KEYWORDS) {
    const match = pattern.exec(sanitized);
    if (match) {
      threats.push({
        type: 'blocked_keyword',
        severity,
        description,
        match: match[0],
        position: match.index,
      });
    }
  }

  const blocked =
    config.strictMode
      ? threats.some((t) => t.severity === 'critical' || t.severity === 'high')
      : threats.some((t) => t.severity === 'critical');

  if (config.logThreats && threats.length > 0) {
    console.warn('[OutputSanitizer] Threats detected:', threats.map((t) => t.description));
  }

  const topThreat = threats.find((t) => t.severity === 'critical') ?? threats[0];

  return {
    passed: !blocked,
    blocked,
    reason: blocked ? topThreat?.description : undefined,
    sanitizedContent: blocked ? undefined : sanitized,
    threats,
  };
}
