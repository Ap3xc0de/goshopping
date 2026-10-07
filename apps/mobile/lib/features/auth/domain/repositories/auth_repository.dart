import '../entities/auth_user.dart';
import '../entities/sign_out_outcome.dart';
import '../entities/social_provider.dart';

/// Authentication contract. Every method throws an `AuthFailure` on error.
abstract class AuthRepository {
  Future<void> signUp({
    required String email,
    required String password,
    String? name,
  });
  Future<void> confirmSignUp({required String email, required String code});
  Future<void> resendSignUpCode(String email);
  Future<AuthUser> signIn({required String email, required String password});
  Future<AuthUser> signInWithSocial(SocialProvider provider);

  /// Never throws: the outcome says whether the remote side also finished.
  Future<SignOutOutcome> signOut();
  Future<void> requestPasswordReset(String email);
  Future<void> confirmPasswordReset({
    required String email,
    required String code,
    required String newPassword,
  });

  /// The signed-in user, or `null` when there is no session.
  Future<AuthUser?> restoreSession();

  /// The current Cognito ID token, or `null` when signed out.
  Future<String?> idToken();
}
