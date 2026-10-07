import '../../features/auth/domain/entities/auth_user.dart';

abstract final class AppRoutes {
  static const splash = '/splash';
  static const notConfigured = '/not-configured';
  static const welcome = '/welcome';
  static const signUp = '/sign-up';
  static const confirm = '/confirm';
  static const forgot = '/forgot';
  static const reset = '/reset';
  static const home = '/home';

  /// Routes reachable while signed out.
  static const publicRoutes = {welcome, signUp, confirm, forgot, reset};
}

/// Pure redirect rules for go_router. Returns `null` to stay on [location].
String? authRedirect({
  required bool isConfigured,
  required bool isRestoring,
  required AuthUser? user,
  required String location,
}) {
  if (!isConfigured) {
    return location == AppRoutes.notConfigured ? null : AppRoutes.notConfigured;
  }
  if (isRestoring) {
    return location == AppRoutes.splash ? null : AppRoutes.splash;
  }
  if (user == null) {
    return AppRoutes.publicRoutes.contains(location) ? null : AppRoutes.welcome;
  }
  return location == AppRoutes.home ? null : AppRoutes.home;
}
