import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../../core/api/api_client.dart';
import '../../../core/config/config_providers.dart';
import '../data/datasources/amplify_auth_data_source.dart';
import '../data/datasources/auth_data_source.dart';
import '../data/datasources/shopper_remote_data_source.dart';
import '../../../core/errors/api_failure.dart';
import '../data/models/shopper.dart';
import '../domain/entities/auth_user.dart';
import '../data/repositories/auth_repository_impl.dart';
import '../domain/entities/social_provider.dart';
import '../domain/repositories/auth_repository.dart';
import '../domain/usecases/confirm_password_reset.dart';
import '../domain/usecases/confirm_sign_up.dart';
import '../domain/usecases/get_id_token.dart';
import '../domain/usecases/request_password_reset.dart';
import '../domain/usecases/resend_sign_up_code.dart';
import '../domain/usecases/restore_session.dart';
import '../domain/usecases/sign_in.dart';
import '../domain/usecases/sign_in_with_social.dart';
import '../domain/usecases/sign_out.dart';
import '../domain/usecases/sign_up.dart';
import 'controllers/action_controllers.dart';
import 'controllers/session_controller.dart';
import 'social_providers_for_platform.dart';

export 'controllers/action_controllers.dart';
export 'controllers/session_controller.dart';

// Wiring. Tests override `authRepositoryProvider` (or `httpClientProvider`).

final authDataSourceProvider = Provider<AuthDataSource>(
  (ref) => const AmplifyAuthDataSource(),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepositoryImpl(ref.watch(authDataSourceProvider)),
);

final signUpUseCaseProvider = Provider(
  (ref) => SignUp(ref.watch(authRepositoryProvider)),
);
final confirmSignUpUseCaseProvider = Provider(
  (ref) => ConfirmSignUp(ref.watch(authRepositoryProvider)),
);
final resendSignUpCodeUseCaseProvider = Provider(
  (ref) => ResendSignUpCode(ref.watch(authRepositoryProvider)),
);
final signInUseCaseProvider = Provider(
  (ref) => SignIn(ref.watch(authRepositoryProvider)),
);
final signInWithSocialUseCaseProvider = Provider(
  (ref) => SignInWithSocial(ref.watch(authRepositoryProvider)),
);
final signOutUseCaseProvider = Provider(
  (ref) => SignOut(ref.watch(authRepositoryProvider)),
);
final requestPasswordResetUseCaseProvider = Provider(
  (ref) => RequestPasswordReset(ref.watch(authRepositoryProvider)),
);
final confirmPasswordResetUseCaseProvider = Provider(
  (ref) => ConfirmPasswordReset(ref.watch(authRepositoryProvider)),
);
final restoreSessionUseCaseProvider = Provider(
  (ref) => RestoreSession(ref.watch(authRepositoryProvider)),
);
final getIdTokenUseCaseProvider = Provider(
  (ref) => GetIdToken(ref.watch(authRepositoryProvider)),
);

final socialProvidersProvider = Provider<List<SocialProvider>>(
  (ref) => socialProvidersFor(defaultTargetPlatform),
);

// Session and API

final sessionProvider = AsyncNotifierProvider<SessionController, AuthUser?>(
  SessionController.new,
  retry: _noRetry,
);

/// Riverpod 3 retries failed providers by default; auth errors must surface
/// immediately instead of leaving the UI loading.
Duration? _noRetry(int retryCount, Object error) => null;

final httpClientProvider = Provider<http.Client>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return client;
});

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(
    baseUrl: ref.watch(appConfigProvider).apiBaseUrl,
    httpClient: ref.watch(httpClientProvider),
  ),
);

final shopperRemoteDataSourceProvider = Provider(
  (ref) => ShopperRemoteDataSource(ref.watch(apiClientProvider)),
);

/// The profile from `GET /me` for the signed-in shopper.
final shopperProvider = FutureProvider.autoDispose<Shopper>((ref) async {
  final token = await ref.watch(getIdTokenUseCaseProvider)();
  if (token == null) throw const UnauthorizedApiFailure();
  return ref.watch(shopperRemoteDataSourceProvider).fetchMe(token);
}, retry: _noRetry);

// Form controllers

final signInControllerProvider =
    NotifierProvider.autoDispose<SignInController, AsyncValue<void>>(
      SignInController.new,
    );
final signUpControllerProvider =
    NotifierProvider.autoDispose<SignUpController, AsyncValue<void>>(
      SignUpController.new,
    );
final confirmCodeControllerProvider =
    NotifierProvider.autoDispose<ConfirmCodeController, AsyncValue<void>>(
      ConfirmCodeController.new,
    );
final forgotPasswordControllerProvider =
    NotifierProvider.autoDispose<ForgotPasswordController, AsyncValue<void>>(
      ForgotPasswordController.new,
    );
final resetPasswordControllerProvider =
    NotifierProvider.autoDispose<ResetPasswordController, AsyncValue<void>>(
      ResetPasswordController.new,
    );
