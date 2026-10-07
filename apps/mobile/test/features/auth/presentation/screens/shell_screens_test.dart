import 'package:flutter/material.dart' show Scaffold;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:goshopping/features/auth/presentation/screens/confirm_code_screen.dart';
import 'package:goshopping/features/auth/presentation/screens/reset_password_screen.dart';
import 'package:goshopping/features/auth/presentation/screens/sign_in_screen.dart';
import 'package:goshopping/core/config/app_config.dart';
import 'package:goshopping/core/strings/app_strings.dart';
import 'package:goshopping/features/auth/domain/entities/sign_out_outcome.dart';
import 'package:goshopping/features/auth/domain/failures/auth_failure.dart';
import 'package:goshopping/features/auth/presentation/auth_keys.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../../../../support/fakes.dart';
import '../../../../support/pump_app.dart';

void main() {
  group('not configured', () {
    testWidgets('shows a clear message and never touches auth', (tester) async {
      final repo = await pumpApp(tester, config: const AppConfig.empty());
      expect(find.text(AppStrings.notConfiguredTitle), findsOneWidget);
      expect(find.text(AppStrings.notConfiguredBody), findsOneWidget);
      expect(find.byKey(AuthKeys.email), findsNothing);
      expect(repo.calls, isEmpty);
    });
  });

  group('deep links that need an email', () {
    Future<void> goTo(WidgetTester tester, String location) async {
      final context = tester.element(find.byType(Scaffold).first);
      GoRouter.of(context).go(location);
      await tester.pumpAndSettle();
    }

    testWidgets('/confirm without an email redirects to welcome', (
      tester,
    ) async {
      await pumpApp(tester);
      await goTo(tester, '/confirm');
      expect(find.byType(ConfirmCodeScreen), findsNothing);
      expect(find.byType(SignInScreen), findsOneWidget);
    });

    testWidgets('/reset without an email redirects to welcome', (tester) async {
      await pumpApp(tester);
      await goTo(tester, '/reset?email=');
      expect(find.byType(ResetPasswordScreen), findsNothing);
      expect(find.byType(SignInScreen), findsOneWidget);
    });

    testWidgets('/confirm and /reset with an email open the screens', (
      tester,
    ) async {
      await pumpApp(tester);
      await goTo(tester, '/confirm?email=ana@example.com');
      expect(find.byType(ConfirmCodeScreen), findsOneWidget);
      await goTo(tester, '/reset?email=ana@example.com');
      expect(find.byType(ResetPasswordScreen), findsOneWidget);
    });
  });

  group('session restore failure', () {
    testWidgets('shows a retry screen instead of looking signed out', (
      tester,
    ) async {
      final repo = FakeAuthRepository()..error = const NetworkFailure();
      await pumpApp(tester, repo: repo);
      expect(find.text(AppStrings.sessionRestoreError), findsOneWidget);
      expect(find.byKey(AuthKeys.email), findsNothing);
    });

    testWidgets('retry re-runs the restore and lands on home', (tester) async {
      final repo = FakeAuthRepository()..error = const NetworkFailure();
      await pumpApp(tester, repo: repo);
      repo.error = null;
      await tester.tap(find.text(AppStrings.retry));
      await tester.pumpAndSettle();
      expect(repo.calls.where((c) => c == 'restore').length, 2);
      expect(find.text(AppStrings.homeTitle), findsOneWidget);
    });

    testWidgets('retry that finds no session lands on welcome', (tester) async {
      final repo = FakeAuthRepository()..error = const NetworkFailure();
      await pumpApp(tester, repo: repo);
      repo.error = null;
      repo.user = null;
      await tester.tap(find.text(AppStrings.retry));
      await tester.pumpAndSettle();
      expect(find.byKey(AuthKeys.email), findsOneWidget);
    });

    testWidgets('a retry that fails again stays on the retry screen', (
      tester,
    ) async {
      final repo = FakeAuthRepository()..error = const NetworkFailure();
      await pumpApp(tester, repo: repo);
      await tester.tap(find.text(AppStrings.retry));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.sessionRestoreError), findsOneWidget);
    });
  });

  group('home', () {
    testWidgets('restores the session and shows the /me profile', (
      tester,
    ) async {
      await pumpApp(tester, repo: FakeAuthRepository());
      expect(find.text(AppStrings.homeTitle), findsOneWidget);
      expect(find.text('Ana Shopper'), findsOneWidget);
      expect(find.text('ana@example.com'), findsOneWidget);
    });

    testWidgets('sign out returns to the welcome screen', (tester) async {
      final repo = await pumpApp(tester, repo: FakeAuthRepository());
      await tester.tap(find.text(AppStrings.signOut));
      await tester.pumpAndSettle();
      expect(repo.calls, contains('signOut'));
      expect(find.byKey(AuthKeys.email), findsOneWidget);
    });

    testWidgets('a complete sign out shows no notice', (tester) async {
      await pumpApp(tester, repo: FakeAuthRepository());
      await tester.tap(find.text(AppStrings.signOut));
      await tester.pumpAndSettle();
      expect(find.byKey(AuthKeys.email), findsOneWidget);
      expect(find.text(AppStrings.signOutPartialNotice), findsNothing);
      expect(find.text(AppStrings.signOutFailedNotice), findsNothing);
    });

    testWidgets('a partial sign out ends signed out and says so', (
      tester,
    ) async {
      final repo = FakeAuthRepository()
        ..signOutOutcome = SignOutOutcome.partial;
      await pumpApp(tester, repo: repo);
      await tester.tap(find.text(AppStrings.signOut));
      await tester.pumpAndSettle();
      expect(find.byKey(AuthKeys.email), findsOneWidget);
      expect(find.text(AppStrings.signOutPartialNotice), findsOneWidget);
    });

    testWidgets('a failed sign out still ends signed out and says so', (
      tester,
    ) async {
      final repo = FakeAuthRepository();
      await pumpApp(tester, repo: repo);
      repo.error = const NetworkFailure();
      await tester.tap(find.text(AppStrings.signOut));
      await tester.pumpAndSettle();
      expect(find.byKey(AuthKeys.email), findsOneWidget);
      expect(find.text(AppStrings.signOutFailedNotice), findsOneWidget);
    });

    testWidgets('sign out is awaited and cannot be triggered twice', (
      tester,
    ) async {
      final repo = FakeAuthRepository();
      await pumpApp(tester, repo: repo);
      final gate = Gate();
      repo.gate = gate.call;
      await tester.tap(find.text(AppStrings.signOut));
      await tester.pump();
      await tester.tap(find.text(AppStrings.signOut), warnIfMissed: false);
      await tester.pump();
      expect(repo.calls.where((c) => c == 'signOut').length, 1);
      expect(find.text(AppStrings.homeTitle), findsOneWidget);

      gate.release();
      await tester.pumpAndSettle();
      expect(find.byKey(AuthKeys.email), findsOneWidget);
    });

    testWidgets('a /me failure shows an error with retry, not a crash', (
      tester,
    ) async {
      var attempts = 0;
      await pumpApp(
        tester,
        repo: FakeAuthRepository(),
        httpClient: MockClient((_) async {
          attempts++;
          return attempts == 1
              ? http.Response('', 503)
              : http.Response(meBody, 200);
        }),
      );
      expect(find.text(AppStrings.profileLoadError), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await tester.pumpAndSettle();
      expect(find.text('Ana Shopper'), findsOneWidget);
    });
  });
}
