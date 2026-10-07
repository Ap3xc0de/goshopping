/// Base type for typed, UI-safe errors. Never carries raw exception text.
abstract class Failure implements Exception {
  const Failure();
}
