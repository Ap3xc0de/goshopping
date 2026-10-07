import 'package:flutter/foundation.dart';

import 'app_config.dart';

/// Configures the identity SDK for [config]; returns whether it succeeded.
typedef AuthConfigurer = Future<bool> Function(AppConfig config);

/// Decides the configuration the app starts with.
///
/// Startup must never crash: when the SDK cannot be configured (or throws), the
/// app falls back to the "not configured" configuration and shows its screen.
Future<AppConfig> resolveStartupConfig(
  AppConfig config, {
  required AuthConfigurer configure,
}) async {
  if (!config.isCognitoConfigured) return config;
  try {
    if (await configure(config)) return config;
  } catch (error) {
    debugPrint('Auth configuration failed: ${error.runtimeType}');
  }
  return const AppConfig.empty();
}
