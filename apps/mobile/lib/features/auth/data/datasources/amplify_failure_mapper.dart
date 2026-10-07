import 'dart:async';
import 'dart:io';

import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';

import '../../domain/failures/auth_failure.dart';

/// Pure mapping from Amplify (and platform) errors to typed failures.
///
/// Raw messages are dropped on purpose so they cannot reach the UI.
AuthFailure mapAmplifyError(Object error) {
  return switch (error) {
    AuthFailure() => error,
    // Also covers unknown users: avoids revealing which emails exist.
    AuthNotAuthorizedException() ||
    UserNotFoundException() ||
    NotAuthorizedServiceException() => const InvalidCredentialsFailure(),
    UserNotConfirmedException() => const UserNotConfirmedFailure(),
    UsernameExistsException() => const UserExistsFailure(),
    CodeMismatchException() => const CodeMismatchFailure(),
    ExpiredCodeException() => const CodeExpiredFailure(),
    InvalidPasswordException() => const WeakPasswordFailure(),
    LimitExceededException() ||
    TooManyRequestsException() ||
    TooManyFailedAttemptsException() => const TooManyRequestsFailure(),
    NetworkException() ||
    SocketException() ||
    TimeoutException() => const NetworkFailure(),
    UserCancelledException() => const CancelledByUserFailure(),
    _ => const UnknownFailure(),
  };
}
