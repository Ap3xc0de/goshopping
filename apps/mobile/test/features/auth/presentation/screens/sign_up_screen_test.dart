import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/strings/app_strings.dart';
import 'package:goshopping/features/auth/domain/failures/auth_failure.dart';
import 'package:goshopping/features/auth/presentation/auth_keys.dart';

import '../../../../support/pump_app.dart';

Future<void> openSignUp(WidgetTester tester) async {
  await tester.tap(find.text(AppStrings.createAccountLink));
  await tester.pumpAndSettle();
}

bool ruleMet(WidgetTester tester, Key rule) {
  final icon = tester.widget<Icon>(
    find.descendant(of: find.byKey(rule), matching: find.byType(Icon)),
  );
  return icon.icon == Icons.check_circle;
}

void main() {
  testWidgets('shows the password rules and a disabled submit', (tester) async {
    await pumpApp(tester);
    await openSignUp(tester);

    expect(find.text(AppStrings.ruleMinLength), findsOneWidget);
    expect(find.text(AppStrings.ruleUppercase), findsOneWidget);
    expect(find.text(AppStrings.ruleLowercase), findsOneWidget);
    expect(find.text(AppStrings.ruleNumber), findsOneWidget);
    expect(isEnabled(tester, AuthKeys.submit), isFalse);
    expect(isObscured(tester, AuthKeys.password), isTrue);
  });

  testWidgets('rules update live as the user types', (tester) async {
    await pumpApp(tester);
    await openSignUp(tester);

    await enter(tester, AuthKeys.password, 'abc');
    expect(ruleMet(tester, AuthKeys.ruleLowercase), isTrue);
    expect(ruleMet(tester, AuthKeys.ruleUppercase), isFalse);
    expect(ruleMet(tester, AuthKeys.ruleNumber), isFalse);
    expect(ruleMet(tester, AuthKeys.ruleMinLength), isFalse);

    await enter(tester, AuthKeys.password, 'Abcdef12');
    for (final k in [
      AuthKeys.ruleMinLength,
      AuthKeys.ruleUppercase,
      AuthKeys.ruleLowercase,
      AuthKeys.ruleNumber,
    ]) {
      expect(ruleMet(tester, k), isTrue);
    }
  });

  testWidgets('submit is enabled only with a valid email and password', (
    tester,
  ) async {
    await pumpApp(tester);
    await openSignUp(tester);

    await enter(tester, AuthKeys.email, 'ana@example.com');
    expect(isEnabled(tester, AuthKeys.submit), isFalse);
    await enter(tester, AuthKeys.password, 'weak');
    expect(isEnabled(tester, AuthKeys.submit), isFalse);
    await enter(tester, AuthKeys.password, 'Abcdef12');
    expect(isEnabled(tester, AuthKeys.submit), isTrue);
    await enter(tester, AuthKeys.email, 'nope');
    expect(isEnabled(tester, AuthKeys.submit), isFalse);
  });

  testWidgets('submits and moves to the confirmation screen', (tester) async {
    final repo = await pumpApp(tester);
    await openSignUp(tester);
    await enter(tester, AuthKeys.email, 'ana@example.com');
    await enter(tester, AuthKeys.name, 'Ana');
    await enter(tester, AuthKeys.password, 'Abcdef12');
    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pumpAndSettle();

    expect(repo.calls, contains('signUp:ana@example.com'));
    expect(find.text(AppStrings.confirmTitle), findsOneWidget);
    expect(find.textContaining('ana@example.com'), findsWidgets);
  });

  testWidgets('shows a friendly message when the user already exists', (
    tester,
  ) async {
    final repo = await pumpApp(tester);
    await openSignUp(tester);
    repo.error = const UserExistsFailure();
    await enter(tester, AuthKeys.email, 'ana@example.com');
    await enter(tester, AuthKeys.password, 'Abcdef12');
    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.errorUserExists), findsOneWidget);
    expect(find.text(AppStrings.signUpTitle), findsOneWidget);
  });

  testWidgets('does not double submit', (tester) async {
    final repo = await pumpApp(tester);
    await openSignUp(tester);
    final gate = Gate();
    repo.gate = gate.call;
    await enter(tester, AuthKeys.email, 'ana@example.com');
    await enter(tester, AuthKeys.password, 'Abcdef12');
    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pump();
    await tester.tap(find.byKey(AuthKeys.submit), warnIfMissed: false);
    await tester.pump();
    expect(repo.calls.where((c) => c.startsWith('signUp')).length, 1);
    gate.release();
    await tester.pumpAndSettle();
  });
}
