import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/strings/app_strings.dart';
import 'package:goshopping/features/auth/domain/entities/social_provider.dart';
import 'package:goshopping/features/auth/domain/failures/auth_failure.dart';
import 'package:goshopping/features/auth/presentation/auth_keys.dart';

import '../../../../support/fakes.dart';
import '../../../../support/pump_app.dart';

void main() {
  testWidgets('shows the form and all three social buttons', (tester) async {
    await pumpApp(tester);
    expect(find.byKey(AuthKeys.email), findsOneWidget);
    expect(find.byKey(AuthKeys.password), findsOneWidget);
    expect(find.text(AppStrings.continueWithGoogle), findsOneWidget);
    expect(find.text(AppStrings.continueWithApple), findsOneWidget);
    expect(find.text(AppStrings.continueWithFacebook), findsOneWidget);
  });

  testWidgets('hides the Apple button when the platform does not offer it', (
    tester,
  ) async {
    await pumpApp(
      tester,
      social: [SocialProvider.google, SocialProvider.facebook],
    );
    expect(find.text(AppStrings.continueWithApple), findsNothing);
    expect(find.text(AppStrings.continueWithGoogle), findsOneWidget);
  });

  testWidgets('the password is obscured and can be revealed', (tester) async {
    await pumpApp(tester);
    expect(isObscured(tester, AuthKeys.password), isTrue);
    await tester.tap(find.byKey(AuthKeys.togglePasswordVisibility));
    await tester.pump();
    expect(isObscured(tester, AuthKeys.password), isFalse);
  });

  testWidgets('exposes accessibility labels', (tester) async {
    final handle = tester.ensureSemantics();
    await pumpApp(tester);
    expect(find.bySemanticsLabel(AppStrings.emailLabel), findsWidgets);
    expect(find.bySemanticsLabel(AppStrings.passwordLabel), findsWidgets);
    handle.dispose();
  });

  testWidgets('an invalid email blocks the submit and shows an error', (
    tester,
  ) async {
    final repo = await pumpApp(tester);
    await enter(tester, AuthKeys.email, 'not-an-email');
    await enter(tester, AuthKeys.password, 'whatever');
    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pump();
    expect(find.text(AppStrings.emailInvalid), findsOneWidget);
    expect(repo.calls, ['restore']);
  });

  testWidgets('a successful sign-in lands on home', (tester) async {
    final repo = FakeAuthRepository()..user = null;
    await pumpApp(tester, repo: repo);
    repo.user = testUser;
    await enter(tester, AuthKeys.email, 'Ana@Example.com');
    await enter(tester, AuthKeys.password, 'Abcdef12');
    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pumpAndSettle();

    expect(repo.calls, contains('signIn:Ana@Example.com'));
    expect(find.text(AppStrings.homeTitle), findsOneWidget);
    expect(find.byKey(AuthKeys.email), findsNothing);
  });

  testWidgets('wrong credentials show a friendly message and stay', (
    tester,
  ) async {
    final repo = FakeAuthRepository()..user = null;
    await pumpApp(tester, repo: repo);
    repo.error = const InvalidCredentialsFailure();
    await enter(tester, AuthKeys.email, 'ana@example.com');
    await enter(tester, AuthKeys.password, 'bad');
    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.errorInvalidCredentials), findsOneWidget);
    expect(find.byKey(AuthKeys.email), findsOneWidget);
  });

  testWidgets('does not double submit and disables the button while loading', (
    tester,
  ) async {
    final repo = FakeAuthRepository()..user = null;
    await pumpApp(tester, repo: repo);
    final gate = Gate();
    repo.gate = gate.call;
    repo.user = testUser;
    await enter(tester, AuthKeys.email, 'ana@example.com');
    await enter(tester, AuthKeys.password, 'Abcdef12');

    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pump();
    expect(isEnabled(tester, AuthKeys.submit), isFalse);
    await tester.tap(find.byKey(AuthKeys.submit), warnIfMissed: false);
    await tester.pump();
    expect(repo.calls.where((c) => c.startsWith('signIn')).length, 1);

    gate.release();
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.homeTitle), findsOneWidget);
  });

  testWidgets('an unconfirmed account offers to confirm it', (tester) async {
    final repo = FakeAuthRepository()..user = null;
    await pumpApp(tester, repo: repo);
    repo.error = const UserNotConfirmedFailure();
    await enter(tester, AuthKeys.email, 'ana@example.com');
    await enter(tester, AuthKeys.password, 'Abcdef12');
    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.errorUserNotConfirmed), findsOneWidget);
    await tester.tap(find.text(AppStrings.confirmAccountAction));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.confirmTitle), findsOneWidget);
  });

  testWidgets(
    'confirm account with an empty email shows a validation message',
    (tester) async {
      final repo = FakeAuthRepository()..user = null;
      await pumpApp(tester, repo: repo);
      repo.error = const UserNotConfirmedFailure();
      await enter(tester, AuthKeys.email, 'ana@example.com');
      await enter(tester, AuthKeys.password, 'Abcdef12');
      await tester.tap(find.byKey(AuthKeys.submit));
      await tester.pumpAndSettle();
      await enter(tester, AuthKeys.email, '');

      await tester.tap(find.text(AppStrings.confirmAccountAction));
      await tester.pumpAndSettle();

      expect(find.text(AppStrings.emailInvalid), findsOneWidget);
      expect(find.text(AppStrings.confirmTitle), findsNothing);

      await enter(tester, AuthKeys.email, 'ana@example.com');
      expect(find.text(AppStrings.emailInvalid), findsNothing);
      await tester.tap(find.text(AppStrings.confirmAccountAction));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.confirmTitle), findsOneWidget);
    },
  );

  testWidgets('confirm account with an invalid email shows the message', (
    tester,
  ) async {
    final repo = FakeAuthRepository()..user = null;
    await pumpApp(tester, repo: repo);
    repo.error = const UserNotConfirmedFailure();
    await enter(tester, AuthKeys.email, 'ana@example.com');
    await enter(tester, AuthKeys.password, 'Abcdef12');
    await tester.tap(find.byKey(AuthKeys.submit));
    await tester.pumpAndSettle();
    await enter(tester, AuthKeys.email, 'nope');

    await tester.tap(find.text(AppStrings.confirmAccountAction));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.emailInvalid), findsOneWidget);
    expect(find.text(AppStrings.confirmTitle), findsNothing);
  });

  testWidgets('a social sign-in that is not confirmed shows a message', (
    tester,
  ) async {
    final repo = FakeAuthRepository()..user = null;
    await pumpApp(tester, repo: repo);
    repo.error = const UserNotConfirmedFailure();
    await tester.tap(find.text(AppStrings.continueWithGoogle));
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.errorSocialNotConfirmed), findsOneWidget);
    expect(find.text(AppStrings.confirmAccountAction), findsNothing);
    expect(tester.takeException(), isNull);
    expect(find.byKey(AuthKeys.email), findsOneWidget);
  });

  testWidgets('social buttons call the matching provider', (tester) async {
    final repo = FakeAuthRepository()..user = null;
    await pumpApp(tester, repo: repo);
    repo.user = testUser;
    await tester.tap(find.text(AppStrings.continueWithApple));
    await tester.pumpAndSettle();
    expect(repo.calls, contains('social:apple'));
    expect(find.text(AppStrings.homeTitle), findsOneWidget);
  });

  testWidgets('cancelling the social flow shows a gentle message', (
    tester,
  ) async {
    final repo = FakeAuthRepository()..user = null;
    await pumpApp(tester, repo: repo);
    repo.error = const CancelledByUserFailure();
    await tester.tap(find.text(AppStrings.continueWithGoogle));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.errorCancelled), findsOneWidget);
  });

  testWidgets('links navigate to sign up and forgot password', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text(AppStrings.createAccountLink));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.signUpTitle), findsOneWidget);

    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text(AppStrings.forgotPasswordLink));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.forgotTitle), findsOneWidget);
  });
}
