/**
 * Built-in redaction patterns for the Safety Layer.
 * Defines regex rules to detect secrets, credentials, and PII in text.
 */

/** A single pattern rule used by the scanner to detect sensitive data */
export interface PatternRule {
  /** Unique identifier for this pattern */
  id: string;
  /** Regular expression to match sensitive data */
  regex: RegExp;
  /** Human-readable label describing what this pattern detects */
  label: string;
  /** Severity level: critical requires immediate redaction, warning is advisory */
  severity: 'critical' | 'warning';
  /** Replacement string to use when redacting matches */
  replacement: string;
}

/**
 * Built-in pattern rules covering common secrets, credentials, and PII.
 * Patterns are ordered by severity (critical first) then by specificity.
 */
export const BUILTIN_PATTERNS: PatternRule[] = [
  {
    id: 'aws_key',
    regex: /AKIA[0-9A-Z]{16}/g,
    label: 'AWS Access Key ID',
    severity: 'critical',
    replacement: '[AWS_KEY_REDACTED]',
  },
  {
    id: 'aws_secret',
    regex: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
    label: 'AWS Secret Access Key',
    severity: 'warning',
    replacement: '[AWS_SECRET_REDACTED]',
  },
  {
    id: 'jwt',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    label: 'JSON Web Token',
    severity: 'critical',
    replacement: '[JWT_REDACTED]',
  },
  {
    id: 'generic_key',
    regex: /(?:api[_-]?key|token|secret|password|passwd)\s*[:=]\s*['"]?[A-Za-z0-9_\-/.+=]{16,}['"]?/gi,
    label: 'Generic Secret or API Key',
    severity: 'critical',
    replacement: '[SECRET_REDACTED]',
  },
  {
    id: 'private_key',
    regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    label: 'Private Key Header',
    severity: 'critical',
    replacement: '[PRIVATE_KEY_REDACTED]',
  },
  {
    id: 'connection_str',
    regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s"']+/gi,
    label: 'Database Connection String',
    severity: 'critical',
    replacement: '[CONNECTION_STRING_REDACTED]',
  },
  {
    id: 'email',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    label: 'Email Address',
    severity: 'warning',
    replacement: '[EMAIL_REDACTED]',
  },
  {
    id: 'ipv4',
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    label: 'IPv4 Address',
    severity: 'warning',
    replacement: '[IP_REDACTED]',
  },
  {
    id: 'arn',
    regex: /arn:aws[a-zA-Z-]*:[a-zA-Z0-9-]+:\S+/g,
    label: 'AWS ARN',
    severity: 'warning',
    replacement: '[ARN_REDACTED]',
  },
];
