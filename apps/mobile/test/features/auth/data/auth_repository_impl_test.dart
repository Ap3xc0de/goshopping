import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:goshopping/features/auth/domain/entities/sign_out_outcome.dart';
import 'package:goshopping/features/auth/domain/entities/social_provider.dart';
import 'package:goshopping/features/auth/domain/failures/auth_failure.dart';

import '../../../support/fakes.dart';

void main() {
  late FakeAuthDataSource ds;
  late AuthRepositoryImpl repo;

  setUp(() {
    ds = FakeAuthDataSource();
    repo = AuthRepositoryImpl(ds);
  });

  group('signOut', () {
    test('returns the outcome reported by the data source', () async {
      for (final outcome in SignOutOutcome.values) {
        ds.signOutOutcome = outcome;
        expect(await repo.signOut(), outcome);
      }
    });

    test('never throws: any error is a failed outcome', () async {
      for (final error in <Object>[
        const NetworkFailure(),
        StateError('x'),
        const SocketException('down'),
      ]) {
        ds.error = error;
        expect(await repo.signOut(), SignOutOutcome.failed);
      }
    });
  });

  group('delegation', () {
    test('normalizes the email (trim + lowercase) on every call', () async {
      await repo.signUp(
        email: ' Ana@Example.COM ',
        password: 'p',
        name: ' Ana ',
      );
      await repo.confirmSignUp(email: 'ANA@x.co', code: ' 123456 ');
      await repo.resendSignUpCode('ANA@x.co');
      await repo.signIn(email: ' ANA@x.co', password: 'p');
      await repo.requestPasswordReset('ANA@x.co');
      await repo.confirmPasswordReset(
        email: 'ANA@x.co',
        code: '111111',
        newPassword: 'n',
      );
      expect(ds.calls, [
        'signUp:ana@example.com:p:Ana',
        'confirmSignUp:ana@x.co:123456',
        'resend:ana@x.co',
        'signIn:ana@x.co:p',
        'reset:ana@x.co',
        'confirmReset:ana@x.co:111111:n',
      ]);
    });

    test('blank name is not sent', () async {
      await repo.signUp(email: 'a@b.co', password: 'p', name: '  ');
      expect(ds.calls.single, 'signUp:a@b.co:p:');
    });

    test('returns users and tokens from the data source', () async {
      expect(await repo.signIn(email: 'a@b.co', password: 'p'), testUser);
      expect(await repo.signInWithSocial(SocialProvider.google), testUser);
      expect(await repo.restoreSession(), testUser);
      expect(await repo.idToken(), 'id-token');
      expect(await repo.signOut(), SignOutOutcome.complete);
      expect(ds.calls.last, 'signOut');
    });
  });

  group('failure mapping', () {
    final typed = <AuthFailure>[
      const InvalidCredentialsFailure(),
      const UserNotConfirmedFailure(),
      const UserExistsFailure(),
      const CodeMismatchFailure(),
      const CodeExpiredFailure(),
      const WeakPasswordFailure(),
      const TooManyRequestsFailure(),
      const NetworkFailure(),
      const CancelledByUserFailure(),
      const UnknownFailure(),
    ];

    for (final failure in typed) {
      test('keeps ${failure.runtimeType} as is', () {
        ds.error = failure;
        expect(
          () => repo.signIn(email: 'a@b.co', password: 'p'),
          throwsA(same(failure)),
        );
      });
    }

    test('socket and timeout errors become NetworkFailure', () {
      ds.error = const SocketException('down');
      expect(
        () => repo.signIn(email: 'a@b.co', password: 'p'),
        throwsA(isA<NetworkFailure>()),
      );
      ds.error = TimeoutException('slow');
      expect(() => repo.idToken(), throwsA(isA<NetworkFailure>()));
    });

    test('unexpected errors never leak: they become UnknownFailure', () {
      ds.error = StateError('secret internals');
      expect(
        () => repo.signUp(email: 'a@b.co', password: 'p'),
        throwsA(
          isA<UnknownFailure>().having(
            (f) => f.toString(),
            'toString',
            isNot(contains('secret')),
          ),
        ),
      );
    });

    test('applies to every operation', () {
      ds.error = StateError('x');
      final ops = <Future<void> Function()>[
        () => repo.confirmSignUp(email: 'a', code: '1'),
        () => repo.resendSignUpCode('a'),
        () => repo.signInWithSocial(SocialProvider.apple),
        () => repo.requestPasswordReset('a'),
        () =>
            repo.confirmPasswordReset(email: 'a', code: '1', newPassword: 'n'),
        () => repo.restoreSession(),
      ];
      for (final op in ops) {
        expect(op, throwsA(isA<UnknownFailure>()));
      }
    });
  });
}
