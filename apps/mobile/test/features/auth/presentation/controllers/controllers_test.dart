import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/features/auth/domain/entities/social_provider.dart';
import 'package:goshopping/features/auth/domain/failures/auth_failure.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderListenable;
import 'package:goshopping/features/auth/presentation/providers.dart';

import '../../../../support/fakes.dart';

void main() {
  late FakeAuthRepository repo;
  late ProviderContainer container;

  setUp(() {
    repo = FakeAuthRepository();
    container = ProviderContainer(
      overrides: [authRepositoryProvider.overrideWithValue(repo)],
    );
    addTearDown(container.dispose);
  });

  /// Keeps an autoDispose provider alive and records every state.
  List<AsyncValue<void>> track(ProviderListenable<AsyncValue<void>> p) {
    final states = <AsyncValue<void>>[];
    container.listen(p, (_, next) => states.add(next), fireImmediately: false);
    return states;
  }

  group('SessionController', () {
    test('restores the user on build', () async {
      final user = await container.read(sessionProvider.future);
      expect(user, testUser);
      expect(repo.calls, ['restore']);
    });

    test('is signed out when there is no session', () async {
      repo.user = null;
      expect(await container.read(sessionProvider.future), isNull);
    });

    test('a restore failure resolves to an error state, not a crash', () async {
      repo.error = const NetworkFailure();
      await expectLater(
        container.read(sessionProvider.future),
        throwsA(isA<NetworkFailure>()),
      );
      expect(container.read(sessionProvider).hasError, isTrue);
    });

    test('setUser and signOut update the state', () async {
      repo.user = null;
      await container.read(sessionProvider.future);
      container.read(sessionProvider.notifier).setUser(testUser);
      expect(container.read(sessionProvider).value, testUser);

      await container.read(sessionProvider.notifier).signOut();
      expect(container.read(sessionProvider).value, isNull);
      expect(repo.calls, contains('signOut'));
    });

    test(
      'signOut clears the local session even if the remote call fails',
      () async {
        await container.read(sessionProvider.future);
        repo.error = const NetworkFailure();
        await container.read(sessionProvider.notifier).signOut();
        expect(container.read(sessionProvider).value, isNull);
      },
    );
  });

  group('SignInController', () {
    test('loading -> success, and publishes the user to the session', () async {
      repo.user = testUser;
      final states = track(signInControllerProvider);
      final ok = await container
          .read(signInControllerProvider.notifier)
          .signIn(email: 'a@b.co', password: 'Abcdef12');

      expect(ok, isTrue);
      expect(states.first.isLoading, isTrue);
      expect(states.last.hasError, isFalse);
      expect(states.last.isLoading, isFalse);
      expect(container.read(sessionProvider).value, testUser);
    });

    test('loading -> error with the typed failure', () async {
      repo.error = const InvalidCredentialsFailure();
      final states = track(signInControllerProvider);
      final ok = await container
          .read(signInControllerProvider.notifier)
          .signIn(email: 'a@b.co', password: 'x');

      expect(ok, isFalse);
      expect(states.first.isLoading, isTrue);
      expect(states.last.error, isA<InvalidCredentialsFailure>());
    });

    test('ignores a second submit while loading', () async {
      final gate = Completer<void>();
      repo.gate = () => gate.future;
      track(signInControllerProvider);
      final c = container.read(signInControllerProvider.notifier);

      final first = c.signIn(email: 'a@b.co', password: 'p');
      final second = await c.signIn(email: 'a@b.co', password: 'p');
      expect(second, isFalse);
      expect(repo.calls.where((c) => c.startsWith('signIn')).length, 1);

      gate.complete();
      expect(await first, isTrue);
    });

    test(
      'social sign-in succeeds and surfaces cancellation as a failure',
      () async {
        track(signInControllerProvider);
        final c = container.read(signInControllerProvider.notifier);
        expect(await c.signInWithSocial(SocialProvider.google), isTrue);
        expect(repo.calls, contains('social:google'));

        repo.error = const CancelledByUserFailure();
        expect(await c.signInWithSocial(SocialProvider.facebook), isFalse);
        expect(
          container.read(signInControllerProvider).error,
          isA<CancelledByUserFailure>(),
        );
      },
    );

    test('a new attempt clears the previous error and can succeed', () async {
      track(signInControllerProvider);
      final c = container.read(signInControllerProvider.notifier);
      repo.error = const InvalidCredentialsFailure();
      await c.signIn(email: 'a@b.co', password: 'x');
      repo.error = null;
      expect(await c.signIn(email: 'a@b.co', password: 'y'), isTrue);
      expect(container.read(signInControllerProvider).hasError, isFalse);
    });

    test('non-failure errors do not escape the controller', () async {
      track(signInControllerProvider);
      repo.error = StateError('boom');
      final ok = await container
          .read(signInControllerProvider.notifier)
          .signIn(email: 'a@b.co', password: 'x');
      expect(ok, isFalse);
      expect(
        container.read(signInControllerProvider).error,
        isA<UnknownFailure>(),
      );
    });
  });

  group('other form controllers', () {
    test('SignUpController', () async {
      track(signUpControllerProvider);
      final c = container.read(signUpControllerProvider.notifier);
      expect(
        await c.signUp(email: 'a@b.co', password: 'Abcdef12', name: 'Ana'),
        isTrue,
      );
      repo.error = const UserExistsFailure();
      expect(await c.signUp(email: 'a@b.co', password: 'Abcdef12'), isFalse);
      expect(
        container.read(signUpControllerProvider).error,
        isA<UserExistsFailure>(),
      );
    });

    test('ConfirmCodeController confirm and resend', () async {
      track(confirmCodeControllerProvider);
      final c = container.read(confirmCodeControllerProvider.notifier);
      expect(await c.confirm(email: 'a@b.co', code: '123456'), isTrue);
      expect(await c.resend('a@b.co'), isTrue);
      repo.error = const CodeMismatchFailure();
      expect(await c.confirm(email: 'a@b.co', code: '000000'), isFalse);
      expect(
        container.read(confirmCodeControllerProvider).error,
        isA<CodeMismatchFailure>(),
      );
    });

    test('ForgotPasswordController', () async {
      track(forgotPasswordControllerProvider);
      final c = container.read(forgotPasswordControllerProvider.notifier);
      expect(await c.request('a@b.co'), isTrue);
      repo.error = const TooManyRequestsFailure();
      expect(await c.request('a@b.co'), isFalse);
    });

    test('ResetPasswordController', () async {
      track(resetPasswordControllerProvider);
      final c = container.read(resetPasswordControllerProvider.notifier);
      expect(
        await c.reset(email: 'a@b.co', code: '123456', newPassword: 'Abcdef12'),
        isTrue,
      );
      repo.error = const CodeExpiredFailure();
      expect(
        await c.reset(email: 'a@b.co', code: '123456', newPassword: 'Abcdef12'),
        isFalse,
      );
      expect(
        container.read(resetPasswordControllerProvider).error,
        isA<CodeExpiredFailure>(),
      );
    });

    test('clearError resets the state', () async {
      track(forgotPasswordControllerProvider);
      repo.error = const NetworkFailure();
      final c = container.read(forgotPasswordControllerProvider.notifier);
      await c.request('a@b.co');
      c.clearError();
      expect(
        container.read(forgotPasswordControllerProvider).hasError,
        isFalse,
      );
    });
  });
}
