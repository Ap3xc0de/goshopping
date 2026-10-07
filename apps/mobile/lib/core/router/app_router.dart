import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers.dart';
import '../../features/auth/presentation/screens/confirm_code_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/home_screen.dart';
import '../../features/auth/presentation/screens/reset_password_screen.dart';
import '../../features/auth/presentation/screens/sign_in_screen.dart';
import '../../features/auth/presentation/screens/sign_up_screen.dart';
import '../config/config_providers.dart';
import '../presentation/basic_screens.dart';
import 'auth_redirect.dart';

/// Redirects to `/welcome` when a deep link arrives without the email.
String? _requireEmail(String email) => email.isEmpty ? AppRoutes.welcome : null;

final routerProvider = Provider<GoRouter>((ref) {
  final configured = ref.watch(appConfigProvider).isCognitoConfigured;
  final refresh = ValueNotifier<int>(0);
  // The session provider talks to Amplify: never touch it when not configured.
  if (configured) {
    ref.listen(sessionProvider, (_, _) => refresh.value++);
  }

  final router = GoRouter(
    initialLocation: AppRoutes.welcome,
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = configured ? ref.read(sessionProvider) : null;
      return authRedirect(
        isConfigured: configured,
        isRestoring: session?.isLoading ?? false,
        restoreFailed: session?.hasError ?? false,
        user: session?.value,
        location: state.uri.path,
      );
    },
    routes: [
      GoRoute(path: AppRoutes.splash, builder: (_, _) => const SplashScreen()),
      GoRoute(
        path: AppRoutes.sessionError,
        builder: (_, _) => SessionRestoreErrorScreen(
          onRetry: () => ref.invalidate(sessionProvider),
        ),
      ),
      GoRoute(
        path: AppRoutes.notConfigured,
        builder: (_, _) => const NotConfiguredScreen(),
      ),
      GoRoute(path: AppRoutes.welcome, builder: (_, _) => const SignInScreen()),
      GoRoute(path: AppRoutes.signUp, builder: (_, _) => const SignUpScreen()),
      GoRoute(
        path: AppRoutes.confirm,
        redirect: (_, state) =>
            _requireEmail(state.uri.queryParameters['email'] ?? ''),
        builder: (_, state) =>
            ConfirmCodeScreen(email: state.uri.queryParameters['email']!),
      ),
      GoRoute(
        path: AppRoutes.forgot,
        builder: (_, _) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.reset,
        redirect: (_, state) =>
            _requireEmail(state.uri.queryParameters['email'] ?? ''),
        builder: (_, state) =>
            ResetPasswordScreen(email: state.uri.queryParameters['email']!),
      ),
      GoRoute(path: AppRoutes.home, builder: (_, _) => const HomeScreen()),
    ],
  );

  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
});
