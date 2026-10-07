import '../../../core/strings/app_strings.dart';
import '../domain/failures/auth_failure.dart';

/// UI copy for a failure. Anything that is not an `AuthFailure` is unknown.
String authFailureMessage(Object? error) => switch (error) {
  InvalidCredentialsFailure() => AppStrings.errorInvalidCredentials,
  UserNotConfirmedFailure() => AppStrings.errorUserNotConfirmed,
  UserExistsFailure() => AppStrings.errorUserExists,
  CodeMismatchFailure() => AppStrings.errorCodeMismatch,
  CodeExpiredFailure() => AppStrings.errorCodeExpired,
  WeakPasswordFailure() => AppStrings.errorWeakPassword,
  TooManyRequestsFailure() => AppStrings.errorTooManyRequests,
  NetworkFailure() => AppStrings.errorNetwork,
  CancelledByUserFailure() => AppStrings.errorCancelled,
  _ => AppStrings.errorUnknown,
};
