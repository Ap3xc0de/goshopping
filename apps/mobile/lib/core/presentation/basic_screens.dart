import 'package:flutter/material.dart';

import '../strings/app_strings.dart';

/// Shown while the stored session is being restored.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(semanticsLabel: AppStrings.loading),
      ),
    );
  }
}

/// Shown when the Cognito `--dart-define` values are missing.
class NotConfiguredScreen extends StatelessWidget {
  const NotConfiguredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.settings_outlined,
                  size: 48,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  AppStrings.notConfiguredTitle,
                  style: theme.textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  AppStrings.notConfiguredBody,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Shown when the stored session could not be restored (not "signed out").
class SessionRestoreErrorScreen extends StatelessWidget {
  const SessionRestoreErrorScreen({super.key, required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  AppStrings.sessionRestoreError,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: onRetry,
                  child: const Text(AppStrings.retry),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
