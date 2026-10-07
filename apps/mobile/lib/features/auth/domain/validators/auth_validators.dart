/// Result of checking a password against the user pool policy.
class PasswordRuleResult {
  const PasswordRuleResult({
    required this.hasMinLength,
    required this.hasUppercase,
    required this.hasLowercase,
    required this.hasNumber,
  });

  final bool hasMinLength;
  final bool hasUppercase;
  final bool hasLowercase;
  final bool hasNumber;

  bool get isValid => hasMinLength && hasUppercase && hasLowercase && hasNumber;
}

/// Mirrors the Cognito pool policy: min 8, upper, lower and a number.
abstract final class PasswordRules {
  static const minLength = 8;

  static PasswordRuleResult check(String password) => PasswordRuleResult(
    hasMinLength: password.length >= minLength,
    hasUppercase: RegExp('[A-Z]').hasMatch(password),
    hasLowercase: RegExp('[a-z]').hasMatch(password),
    hasNumber: RegExp('[0-9]').hasMatch(password),
  );
}

final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

bool isValidEmail(String value) => _emailPattern.hasMatch(value.trim());

final _codePattern = RegExp(r'^\d{6}$');

bool isValidConfirmationCode(String value) =>
    _codePattern.hasMatch(value.trim());
