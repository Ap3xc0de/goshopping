export interface GuardResult {
  passed: boolean;
  blocked: boolean;
  reason?: string;
  sanitizedContent?: string;
  threats: Threat[];
}

export interface Threat {
  type: 'prompt_injection' | 'data_leakage' | 'code_injection' | 'scope_violation' | 'blocked_keyword';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  match: string;
  position?: number;
}

export interface GuardConfig {
  strictMode: boolean;
  logThreats: boolean;
  maxInputLength: number;
  maxOutputLength: number;
}

export const DEFAULT_CONFIG: GuardConfig = {
  strictMode: true,
  logThreats: true,
  maxInputLength: 5000,
  maxOutputLength: 50000,
};
