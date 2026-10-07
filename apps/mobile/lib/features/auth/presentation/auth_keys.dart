import 'package:flutter/widgets.dart';

/// Widget keys shared between screens and tests.
abstract final class AuthKeys {
  static const email = Key('auth-email');
  static const password = Key('auth-password');
  static const name = Key('auth-name');
  static const code = Key('auth-code');
  static const submit = Key('auth-submit');
  static const togglePasswordVisibility = Key('auth-toggle-password');
  static const ruleMinLength = Key('rule-min-length');
  static const ruleUppercase = Key('rule-uppercase');
  static const ruleLowercase = Key('rule-lowercase');
  static const ruleNumber = Key('rule-number');
}
