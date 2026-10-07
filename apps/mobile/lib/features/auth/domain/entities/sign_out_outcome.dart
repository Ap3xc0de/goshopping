/// How far a sign out got. The app is always signed out locally afterwards;
/// this only tells the user whether the server side (token revocation, Hosted
/// UI session) also finished.
enum SignOutOutcome {
  /// Everything was cleared, locally and remotely.
  complete,

  /// Local credentials were cleared, but a remote step failed.
  partial,

  /// The identity provider could not confirm the sign out.
  failed,
}
