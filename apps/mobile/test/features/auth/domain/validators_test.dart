import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/config/auth_policy.dart';
import 'package:goshopping/core/strings/app_strings.dart';
import 'package:goshopping/features/auth/domain/validators/auth_validators.dart';

void main() {
  group('PasswordRules.check', () {
    test('accepts a password meeting every rule', () {
      final r = PasswordRules.check('Abcdef12');
      expect(r.isValid, isTrue);
      expect(r.hasMinLength, isTrue);
      expect(r.hasUppercase, isTrue);
      expect(r.hasLowercase, isTrue);
      expect(r.hasNumber, isTrue);
    });

    test('rejects a short password', () {
      final r = PasswordRules.check('Abc1234');
      expect(r.hasMinLength, isFalse);
      expect(r.isValid, isFalse);
    });

    test('reports each missing rule independently', () {
      expect(PasswordRules.check('abcdefg1').hasUppercase, isFalse);
      expect(PasswordRules.check('ABCDEFG1').hasLowercase, isFalse);
      expect(PasswordRules.check('Abcdefgh').hasNumber, isFalse);
    });

    test('empty password fails everything', () {
      final r = PasswordRules.check('');
      expect(r.isValid, isFalse);
      expect(
        r.hasMinLength || r.hasUppercase || r.hasLowercase || r.hasNumber,
        isFalse,
      );
    });

    test('symbols are allowed but not required', () {
      expect(PasswordRules.check('Abcdef1!').isValid, isTrue);
    });
  });

  group('isValidEmail', () {
    test('accepts common addresses', () {
      expect(isValidEmail('ana@example.com'), isTrue);
      expect(isValidEmail('  ana.perez+tag@sub.example.co  '), isTrue);
    });

    test('rejects malformed addresses', () {
      for (final bad in [
        '',
        'ana',
        'ana@',
        '@example.com',
        'a@b',
        'a b@c.com',
      ]) {
        expect(isValidEmail(bad), isFalse, reason: bad);
      }
    });
  });

  group('isValidConfirmationCode', () {
    test('accepts six digits only', () {
      expect(isValidConfirmationCode('123456'), isTrue);
      expect(isValidConfirmationCode(' 123456 '), isTrue);
      expect(isValidConfirmationCode('12345'), isFalse);
      expect(isValidConfirmationCode('12345a'), isFalse);
    });
  });

  group('single source of truth', () {
    test('every rule drives both isMet and isValid', () {
      expect(PasswordRule.values, hasLength(4));
      for (final rule in PasswordRule.values) {
        // A password that satisfies every rule except [rule] is invalid.
        final candidates = {
          PasswordRule.minLength: 'Ab1',
          PasswordRule.uppercase: 'abcdefg1',
          PasswordRule.lowercase: 'ABCDEFG1',
          PasswordRule.number: 'Abcdefgh',
        };
        final result = PasswordRules.check(candidates[rule]!);
        expect(result.isMet(rule), isFalse, reason: '$rule');
        expect(result.isValid, isFalse, reason: '$rule');
      }
      expect(PasswordRules.check('Abcdef12').isValid, isTrue);
    });

    test('the min length and code length come from the shared policy', () {
      expect(PasswordRules.minLength, AuthPolicy.passwordMinLength);
      expect(PasswordRules.check('Aa1${'x' * 4}').hasMinLength, isFalse);
      expect(
        PasswordRules.check('Aa1${'x' * (AuthPolicy.passwordMinLength - 3)}')
            .hasMinLength,
        isTrue,
      );
      final code = '1' * AuthPolicy.confirmationCodeLength;
      expect(isValidConfirmationCode(code), isTrue);
      expect(isValidConfirmationCode('$code${1}'), isFalse);
      expect(isValidConfirmationCode(code.substring(1)), isFalse);
    });

    test('Spanish copy mentions the shared lengths', () {
      expect(
        AppStrings.ruleMinLength,
        contains('${AuthPolicy.passwordMinLength}'),
      );
      expect(
        AppStrings.confirmInstructions('a@b.co'),
        contains('${AuthPolicy.confirmationCodeLength}'),
      );
    });
  });
}
