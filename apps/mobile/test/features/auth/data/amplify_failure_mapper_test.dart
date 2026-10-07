import 'dart:async';
import 'dart:io';

import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/features/auth/data/datasources/amplify_failure_mapper.dart';
import 'package:goshopping/features/auth/domain/failures/auth_failure.dart';

void main() {
  final cases = <String, (Object, Matcher)>{
    'NotAuthorized': (
      const AuthNotAuthorizedException('bad'),
      isA<InvalidCredentialsFailure>(),
    ),
    'UserNotFound': (
      const UserNotFoundException('nope'),
      isA<InvalidCredentialsFailure>(),
    ),
    'UserNotConfirmed': (
      const UserNotConfirmedException('x'),
      isA<UserNotConfirmedFailure>(),
    ),
    'UsernameExists': (
      const UsernameExistsException('x'),
      isA<UserExistsFailure>(),
    ),
    'CodeMismatch': (
      const CodeMismatchException('x'),
      isA<CodeMismatchFailure>(),
    ),
    'ExpiredCode': (const ExpiredCodeException('x'), isA<CodeExpiredFailure>()),
    'InvalidPassword': (
      const InvalidPasswordException('x'),
      isA<WeakPasswordFailure>(),
    ),
    'LimitExceeded': (
      const LimitExceededException('x'),
      isA<TooManyRequestsFailure>(),
    ),
    'TooManyRequests': (
      const TooManyRequestsException('x'),
      isA<TooManyRequestsFailure>(),
    ),
    'TooManyFailedAttempts': (
      const TooManyFailedAttemptsException('x'),
      isA<TooManyRequestsFailure>(),
    ),
    'Network': (const NetworkException('x'), isA<NetworkFailure>()),
    'SocketException': (const SocketException('x'), isA<NetworkFailure>()),
    'Timeout': (TimeoutException('x'), isA<NetworkFailure>()),
    'UserCancelled': (
      const UserCancelledException('x'),
      isA<CancelledByUserFailure>(),
    ),
    'Unknown amplify': (const UnknownException('boom'), isA<UnknownFailure>()),
    'Arbitrary': (StateError('boom'), isA<UnknownFailure>()),
  };

  cases.forEach((name, c) {
    test('maps $name', () => expect(mapAmplifyError(c.$1), c.$2));
  });

  test('already-mapped failures pass through', () {
    const f = CodeMismatchFailure();
    expect(mapAmplifyError(f), same(f));
  });

  test('raw messages are never exposed', () {
    final f = mapAmplifyError(const AuthNotAuthorizedException('secret text'));
    expect(f.toString(), isNot(contains('secret')));
  });
}
