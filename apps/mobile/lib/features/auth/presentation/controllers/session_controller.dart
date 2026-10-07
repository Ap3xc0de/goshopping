import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/auth_user.dart';
import '../providers.dart';

/// Holds the signed-in user. Restores the session from storage on startup.
class SessionController extends AsyncNotifier<AuthUser?> {
  @override
  Future<AuthUser?> build() => ref.read(restoreSessionUseCaseProvider)();

  void setUser(AuthUser user) => state = AsyncData(user);

  /// Always ends signed out locally, even if the remote call fails.
  Future<void> signOut() async {
    try {
      await ref.read(signOutUseCaseProvider)();
    } catch (_) {
      // The local session is cleared regardless.
    }
    if (ref.mounted) state = const AsyncData(null);
  }
}
