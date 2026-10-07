import 'failure.dart';

/// Typed errors from calls to the Core API.
sealed class ApiFailure extends Failure {
  const ApiFailure();

  @override
  String toString() => '$runtimeType';
}

/// The token was rejected (HTTP 401).
final class UnauthorizedApiFailure extends ApiFailure {
  const UnauthorizedApiFailure();
}

/// Connectivity problem or timeout.
final class NetworkApiFailure extends ApiFailure {
  const NetworkApiFailure();
}

/// Any other non-2xx response.
final class ServerApiFailure extends ApiFailure {
  const ServerApiFailure(this.statusCode);

  final int statusCode;
}

/// The body was not the JSON object we expected.
final class MalformedResponseApiFailure extends ApiFailure {
  const MalformedResponseApiFailure();
}
