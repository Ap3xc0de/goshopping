import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/auth_user.dart';
import '../../domain/entities/sign_out_outcome.dart';
import '../providers.dart';

/// Holds the signed-in user. Restores the session from storage on startup.
class SessionController extends AsyncNotifier<AuthUser?> {
  @override
  Future<AuthUser?> build() => ref.read(restoreSessionUseCaseProvider)();

  void setUser(AuthUser user) => state = AsyncData(user);

  /// Always ends signed out in the app, even if the remote call fails. The
  /// returned outcome lets the caller tell the user what did not finish.
  Future<SignOutOutcome> signOut() async {
    var outcome = SignOutOutcome.failed;
    try {
      outcome = await ref.read(signOutUseCaseProvider)();
    } catch (_) {
      // Reported as failed; the local session is cleared regardless.
    }
    if (ref.mounted) state = const AsyncData(null);
    return outcome;
  }
}
