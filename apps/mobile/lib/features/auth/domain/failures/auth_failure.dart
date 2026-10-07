import '../../../../core/errors/failure.dart';

/// Typed authentication errors. The UI maps these to localized copy and never
/// shows raw exception text.
sealed class AuthFailure extends Failure {
  const AuthFailure();

  @override
  String toString() => '$runtimeType';
}

final class InvalidCredentialsFailure extends AuthFailure {
  const InvalidCredentialsFailure();
}

final class UserNotConfirmedFailure extends AuthFailure {
  const UserNotConfirmedFailure();
}

final class UserExistsFailure extends AuthFailure {
  const UserExistsFailure();
}

final class CodeMismatchFailure extends AuthFailure {
  const CodeMismatchFailure();
}

final class CodeExpiredFailure extends AuthFailure {
  const CodeExpiredFailure();
}

final class WeakPasswordFailure extends AuthFailure {
  const WeakPasswordFailure();
}

final class TooManyRequestsFailure extends AuthFailure {
  const TooManyRequestsFailure();
}

final class NetworkFailure extends AuthFailure {
  const NetworkFailure();
}

final class CancelledByUserFailure extends AuthFailure {
  const CancelledByUserFailure();
}

final class UnknownFailure extends AuthFailure {
  const UnknownFailure();
}
