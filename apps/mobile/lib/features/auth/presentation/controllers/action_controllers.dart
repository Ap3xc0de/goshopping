import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/social_provider.dart';
import '../../domain/failures/auth_failure.dart';
import '../providers.dart';

/// Base for one-shot form actions: `AsyncLoading` while running, then
/// `AsyncData` or an `AsyncError` carrying an `AuthFailure`.
abstract class ActionNotifier extends Notifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// Runs [action] unless one is already running. Returns whether it succeeded.
  Future<bool> run(Future<void> Function() action) async {
    if (state.isLoading) return false;
    state = const AsyncLoading();
    try {
      await action();
      if (ref.mounted) state = const AsyncData(null);
      return true;
    } catch (error, stack) {
      final failure = error is AuthFailure ? error : const UnknownFailure();
      if (ref.mounted) state = AsyncError(failure, stack);
      return false;
    }
  }

  void clearError() {
    if (!state.isLoading) state = const AsyncData(null);
  }
}

class SignInController extends ActionNotifier {
  Future<bool> signIn({required String email, required String password}) =>
      run(() async {
        final user = await ref.read(signInUseCaseProvider)(
          email: email,
          password: password,
        );
        ref.read(sessionProvider.notifier).setUser(user);
      });

  Future<bool> signInWithSocial(SocialProvider provider) => run(() async {
    final user = await ref.read(signInWithSocialUseCaseProvider)(provider);
    ref.read(sessionProvider.notifier).setUser(user);
  });
}

class SignUpController extends ActionNotifier {
  Future<bool> signUp({
    required String email,
    required String password,
    String? name,
  }) => run(
    () => ref.read(signUpUseCaseProvider)(
      email: email,
      password: password,
      name: name,
    ),
  );
}

class ConfirmCodeController extends ActionNotifier {
  Future<bool> confirm({required String email, required String code}) => run(
    () => ref.read(confirmSignUpUseCaseProvider)(email: email, code: code),
  );

  Future<bool> resend(String email) =>
      run(() => ref.read(resendSignUpCodeUseCaseProvider)(email));
}

class ForgotPasswordController extends ActionNotifier {
  Future<bool> request(String email) =>
      run(() => ref.read(requestPasswordResetUseCaseProvider)(email));
}

class ResetPasswordController extends ActionNotifier {
  Future<bool> reset({
    required String email,
    required String code,
    required String newPassword,
  }) => run(
    () => ref.read(confirmPasswordResetUseCaseProvider)(
      email: email,
      code: code,
      newPassword: newPassword,
    ),
  );
}
