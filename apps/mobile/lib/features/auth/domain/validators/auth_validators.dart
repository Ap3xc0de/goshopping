import '../../../../core/config/auth_policy.dart';

/// One rule of the user pool password policy. The rule definitions drive both
/// the validation and the checklist the user sees.
enum PasswordRule {
  minLength,
  uppercase,
  lowercase,
  number;

  bool isMetBy(String password) => switch (this) {
    PasswordRule.minLength => password.length >= AuthPolicy.passwordMinLength,
    PasswordRule.uppercase => RegExp('[A-Z]').hasMatch(password),
    PasswordRule.lowercase => RegExp('[a-z]').hasMatch(password),
    PasswordRule.number => RegExp('[0-9]').hasMatch(password),
  };
}

/// Result of checking a password against every [PasswordRule].
class PasswordRuleResult {
  const PasswordRuleResult(this._met);

  final Set<PasswordRule> _met;

  bool isMet(PasswordRule rule) => _met.contains(rule);

  bool get hasMinLength => isMet(PasswordRule.minLength);
  bool get hasUppercase => isMet(PasswordRule.uppercase);
  bool get hasLowercase => isMet(PasswordRule.lowercase);
  bool get hasNumber => isMet(PasswordRule.number);

  bool get isValid => PasswordRule.values.every(isMet);
}

/// Mirrors the Cognito pool policy: min 8, upper, lower and a number.
abstract final class PasswordRules {
  static const minLength = AuthPolicy.passwordMinLength;

  static PasswordRuleResult check(String password) => PasswordRuleResult({
    for (final rule in PasswordRule.values)
      if (rule.isMetBy(password)) rule,
  });
}

final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

bool isValidEmail(String value) => _emailPattern.hasMatch(value.trim());

final _codePattern = RegExp('^\\d{${AuthPolicy.confirmationCodeLength}}\$');

bool isValidConfirmationCode(String value) =>
    _codePattern.hasMatch(value.trim());
