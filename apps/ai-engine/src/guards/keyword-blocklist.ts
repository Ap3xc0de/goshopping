/**
 * Keyword blocklist — patterns that are always prohibited in AI outputs and generated code.
 * These are checked case-insensitively unless flagged as case-sensitive.
 */

export interface BlocklistEntry {
  pattern: RegExp;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const BLOCKED_KEYWORDS: BlocklistEntry[] = [
  // Internal infrastructure exposure
  {
    pattern: /\bstore_id\b/i,
    description: 'Internal store_id field exposed',
    severity: 'high',
  },
  {
    pattern: /\bapi[_-]?key\b/i,
    description: 'API key reference exposed',
    severity: 'critical',
  },
  {
    pattern: /\bsecret\b/i,
    description: 'Secret reference in output',
    severity: 'high',
  },
  {
    pattern: /\bprivate[_-]?key\b/i,
    description: 'Private key reference',
    severity: 'critical',
  },
  {
    pattern: /\bpassword\s*[:=]/i,
    description: 'Password assignment detected',
    severity: 'critical',
  },
  {
    pattern: /\btoken\s*[:=]/i,
    description: 'Token assignment detected',
    severity: 'high',
  },
  // Internal endpoint patterns
  {
    pattern: /localhost:\d+/i,
    description: 'Internal localhost URL',
    severity: 'high',
  },
  {
    pattern: /127\.0\.0\.1/,
    description: 'Internal loopback address',
    severity: 'high',
  },
  {
    pattern: /10\.\d+\.\d+\.\d+/,
    description: 'Internal network IP address',
    severity: 'high',
  },
  {
    pattern: /192\.168\.\d+\.\d+/,
    description: 'Private network IP address',
    severity: 'high',
  },
  // Environment variables exposure
  {
    pattern: /process\.env\.[A-Z_]{3,}/,
    description: 'Environment variable access in generated code',
    severity: 'critical',
  },
  // SQL injection patterns in generated code
  {
    pattern: /\b(DROP|DELETE|TRUNCATE|ALTER)\s+TABLE\b/i,
    description: 'Destructive SQL statement',
    severity: 'critical',
  },
  {
    pattern: /\bEXEC\s*\(/i,
    description: 'SQL EXEC call',
    severity: 'high',
  },
];

export const CODE_BLOCKED_PATTERNS: BlocklistEntry[] = [
  {
    pattern: /\beval\s*\(/,
    description: 'eval() usage is prohibited',
    severity: 'critical',
  },
  {
    pattern: /\bFunction\s*\(/,
    description: 'new Function() is prohibited',
    severity: 'critical',
  },
  {
    pattern: /\brequire\s*\(\s*['"`]child_process/,
    description: 'child_process module is prohibited',
    severity: 'critical',
  },
  {
    pattern: /\brequire\s*\(\s*['"`]fs/,
    description: 'fs module is prohibited in generated components',
    severity: 'high',
  },
  {
    pattern: /\brequire\s*\(\s*['"`]path/,
    description: 'path module is prohibited in generated components',
    severity: 'medium',
  },
  {
    pattern: /import\s+.*\s+from\s+['"`]child_process/,
    description: 'child_process import is prohibited',
    severity: 'critical',
  },
  {
    pattern: /import\s+.*\s+from\s+['"`]fs['"`;]/,
    description: 'fs import is prohibited in generated components',
    severity: 'high',
  },
  {
    pattern: /document\.cookie/,
    description: 'Direct cookie access is prohibited',
    severity: 'high',
  },
  {
    pattern: /localStorage\.(set|get)Item/,
    description: 'Direct localStorage access is prohibited in generated components',
    severity: 'medium',
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    description: 'XMLHttpRequest usage is prohibited; use fetch with approved URLs',
    severity: 'high',
  },
  {
    pattern: /process\.env\.[A-Z_a-z]{3,}/,
    description: 'Environment variable access in generated code',
    severity: 'critical',
  },
];
