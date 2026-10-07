import '../../domain/entities/auth_user.dart';
import '../../domain/entities/sign_out_outcome.dart';
import '../../domain/entities/social_provider.dart';

/// Identity provider access. Implementations throw `AuthFailure`s only.
abstract class AuthDataSource {
  Future<void> signUp({
    required String email,
    required String password,
    String? name,
  });
  Future<void> confirmSignUp({required String email, required String code});
  Future<void> resendSignUpCode(String email);
  Future<AuthUser> signIn({required String email, required String password});
  Future<AuthUser> signInWithSocial(SocialProvider provider);

  /// Never leaves credentials silently behind: reports how far it got.
  Future<SignOutOutcome> signOut();
  Future<void> requestPasswordReset(String email);
  Future<void> confirmPasswordReset({
    required String email,
    required String code,
    required String newPassword,
  });
  Future<AuthUser?> currentUser();
  Future<String?> idToken();
}
