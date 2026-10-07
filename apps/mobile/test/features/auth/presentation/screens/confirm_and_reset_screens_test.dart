import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/strings/app_strings.dart';
import 'package:goshopping/features/auth/domain/failures/auth_failure.dart';
import 'package:goshopping/features/auth/presentation/auth_keys.dart';

import '../../../../support/pump_app.dart';

Future<void> signUpToConfirm(WidgetTester tester) async {
  await tester.tap(find.text(AppStrings.createAccountLink));
  await tester.pumpAndSettle();
  await enter(tester, AuthKeys.email, 'ana@example.com');
  await enter(tester, AuthKeys.password, 'Abcdef12');
  await tester.tap(find.byKey(AuthKeys.submit));
  await tester.pumpAndSettle();
}

Future<void> openForgot(WidgetTester tester) async {
  await tester.tap(find.text(AppStrings.forgotPasswordLink));
  await tester.pumpAndSettle();
}

void main() {
  group('confirm code', () {
    testWidgets('submit is disabled until the code has 6 digits', (
      tester,
    ) async {
      await pumpApp(tester);
      await signUpToConfirm(tester);

      expect(isEnabled(tester, AuthKeys.submit), isFalse);
      await enter(tester, AuthKeys.code, '123');
      expect(isEnabled(tester, AuthKeys.submit), isFalse);
      await enter(tester, AuthKeys.code, '123456');
      expect(isEnabled(tester, AuthKeys.submit), isTrue);
    });

    testWidgets('confirming returns to sign in with a notice', (tester) async {
      final repo = await pumpApp(tester);
      await signUpToConfirm(tester);
      await enter(tester, AuthKeys.code, '123456');
      await tester.tap(find.byKey(AuthKeys.submit));
      await tester.pumpAndSettle();

      expect(repo.calls, contains('confirmSignUp:ana@example.com:123456'));
      expect(find.byKey(AuthKeys.email), findsOneWidget);
      expect(find.text(AppStrings.accountConfirmedNotice), findsOneWidget);
    });

    testWidgets('a wrong code shows a message', (tester) async {
      final repo = await pumpApp(tester);
      await signUpToConfirm(tester);
      repo.error = const CodeMismatchFailure();
      await enter(tester, AuthKeys.code, '000000');
      await tester.tap(find.byKey(AuthKeys.submit));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.errorCodeMismatch), findsOneWidget);
    });

    testWidgets('resend asks for a new code and confirms it', (tester) async {
      final repo = await pumpApp(tester);
      await signUpToConfirm(tester);
      await tester.tap(find.text(AppStrings.resendCode));
      await tester.pumpAndSettle();
      expect(repo.calls, contains('resend:ana@example.com'));
      expect(find.text(AppStrings.codeResentNotice), findsOneWidget);
    });
  });

  group('forgot and reset password', () {
    testWidgets('the send button needs a valid email', (tester) async {
      await pumpApp(tester);
      await openForgot(tester);
      expect(isEnabled(tester, AuthKeys.submit), isFalse);
      await enter(tester, AuthKeys.email, 'ana@example.com');
      expect(isEnabled(tester, AuthKeys.submit), isTrue);
    });

    testWidgets('full flow: request code, set new password, back to sign in', (
      tester,
    ) async {
      final repo = await pumpApp(tester);
      await openForgot(tester);
      await enter(tester, AuthKeys.email, 'ana@example.com');
      await tester.tap(find.byKey(AuthKeys.submit));
      await tester.pumpAndSettle();

      expect(repo.calls, contains('reset:ana@example.com'));
      expect(find.text(AppStrings.resetTitle), findsOneWidget);
      expect(isEnabled(tester, AuthKeys.submit), isFalse);
      expect(isObscured(tester, AuthKeys.password), isTrue);

      await enter(tester, AuthKeys.code, '123456');
      await enter(tester, AuthKeys.password, 'weak');
      expect(isEnabled(tester, AuthKeys.submit), isFalse);
      await enter(tester, AuthKeys.password, 'NewPass123');
      expect(isEnabled(tester, AuthKeys.submit), isTrue);
      await tester.tap(find.byKey(AuthKeys.submit));
      await tester.pumpAndSettle();

      expect(repo.calls, contains('confirmReset:ana@example.com:123456'));
      expect(find.byKey(AuthKeys.email), findsOneWidget);
      expect(find.text(AppStrings.passwordResetNotice), findsOneWidget);
    });

    testWidgets('an expired code shows a message', (tester) async {
      final repo = await pumpApp(tester);
      await openForgot(tester);
      await enter(tester, AuthKeys.email, 'ana@example.com');
      await tester.tap(find.byKey(AuthKeys.submit));
      await tester.pumpAndSettle();

      repo.error = const CodeExpiredFailure();
      await enter(tester, AuthKeys.code, '123456');
      await enter(tester, AuthKeys.password, 'NewPass123');
      await tester.tap(find.byKey(AuthKeys.submit));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.errorCodeExpired), findsOneWidget);
    });
  });
}
