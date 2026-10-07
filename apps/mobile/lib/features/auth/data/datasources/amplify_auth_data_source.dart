import 'package:amplify_auth_cognito/amplify_auth_cognito.dart' hide AuthUser;
import 'package:amplify_flutter/amplify_flutter.dart'
    hide AuthUser, SocialProvider;

import '../../domain/entities/auth_user.dart';
import '../../domain/entities/social_provider.dart';
import '../../domain/failures/auth_failure.dart';
import 'amplify_failure_mapper.dart';
import 'auth_data_source.dart';

/// Thin wrapper over `Amplify.Auth`. Not unit tested (it needs the native
/// plugin); the error mapping lives in `mapAmplifyError`, which is.
///
/// The email is the Cognito username.
class AmplifyAuthDataSource implements AuthDataSource {
  const AmplifyAuthDataSource();

  Future<T> _guard<T>(Future<T> Function() action) async {
    try {
      return await action();
    } catch (error) {
      throw mapAmplifyError(error);
    }
  }

  @override
  Future<void> signUp({
    required String email,
    required String password,
    String? name,
  }) => _guard(() async {
    await Amplify.Auth.signUp(
      username: email,
      password: password,
      options: SignUpOptions(
        userAttributes: {
          AuthUserAttributeKey.email: email,
          AuthUserAttributeKey.name: ?name,
        },
      ),
    );
  });

  @override
  Future<void> confirmSignUp({required String email, required String code}) =>
      _guard(() async {
        await Amplify.Auth.confirmSignUp(
          username: email,
          confirmationCode: code,
        );
      });

  @override
  Future<void> resendSignUpCode(String email) => _guard(() async {
    await Amplify.Auth.resendSignUpCode(username: email);
  });

  @override
  Future<AuthUser> signIn({required String email, required String password}) =>
      _guard(() async {
        final result = await Amplify.Auth.signIn(
          username: email,
          password: password,
        );
        if (result.isSignedIn) return _loadUser();
        if (result.nextStep.signInStep == AuthSignInStep.confirmSignUp) {
          throw const UserNotConfirmedFailure();
        }
        // MFA / new-password challenges are not part of this app's pool.
        throw const UnknownFailure();
      });

  @override
  Future<AuthUser> signInWithSocial(SocialProvider provider) =>
      _guard(() async {
        final result = await Amplify.Auth.signInWithWebUI(
          provider: switch (provider) {
            SocialProvider.google => AuthProvider.google,
            SocialProvider.apple => AuthProvider.apple,
            SocialProvider.facebook => AuthProvider.facebook,
          },
        );
        if (!result.isSignedIn) throw const UnknownFailure();
        return _loadUser();
      });

  @override
  Future<void> signOut() => _guard(() async {
    await Amplify.Auth.signOut();
  });

  @override
  Future<void> requestPasswordReset(String email) => _guard(() async {
    await Amplify.Auth.resetPassword(username: email);
  });

  @override
  Future<void> confirmPasswordReset({
    required String email,
    required String code,
    required String newPassword,
  }) => _guard(() async {
    await Amplify.Auth.confirmResetPassword(
      username: email,
      newPassword: newPassword,
      confirmationCode: code,
    );
  });

  @override
  Future<AuthUser?> currentUser() => _guard(() async {
    final session = await Amplify.Auth.fetchAuthSession();
    if (!session.isSignedIn) return null;
    return _loadUser();
  });

  @override
  Future<String?> idToken() => _guard(() async {
    final session = await Amplify.Auth.fetchAuthSession();
    if (!session.isSignedIn) return null;
    final tokens = (session as CognitoAuthSession).userPoolTokensResult.value;
    return tokens.idToken.raw;
  });

  Future<AuthUser> _loadUser() async {
    final user = await Amplify.Auth.getCurrentUser();
    final attributes = await Amplify.Auth.fetchUserAttributes();
    String? attribute(AuthUserAttributeKey key) {
      for (final a in attributes) {
        if (a.userAttributeKey == key) return a.value;
      }
      return null;
    }

    return AuthUser(
      id: user.userId,
      email: attribute(AuthUserAttributeKey.email) ?? '',
      name: attribute(AuthUserAttributeKey.name),
    );
  }
}
