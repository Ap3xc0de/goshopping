import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/strings/app_strings.dart';
import '../../data/models/shopper.dart';
import '../providers.dart';

/// Placeholder home: shows the profile returned by `GET /me`.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shopper = ref.watch(shopperProvider);
    final sessionEmail = ref.watch(sessionProvider).value?.email ?? '';

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.homeTitle)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: shopper.when(
                  data: (s) => _Profile(shopper: s),
                  loading: () => const Center(
                    child: CircularProgressIndicator(
                      semanticsLabel: AppStrings.loading,
                    ),
                  ),
                  error: (_, _) => Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(sessionEmail),
                      const SizedBox(height: 8),
                      const Text(AppStrings.profileLoadError),
                      TextButton(
                        onPressed: () => ref.invalidate(shopperProvider),
                        child: const Text(AppStrings.retry),
                      ),
                    ],
                  ),
                ),
              ),
              OutlinedButton(
                onPressed: () => ref.read(sessionProvider.notifier).signOut(),
                child: const Text(AppStrings.signOut),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Profile extends StatelessWidget {
  const _Profile({required this.shopper});

  final Shopper shopper;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        CircleAvatar(
          radius: 36,
          backgroundImage: shopper.avatarUrl.isEmpty
              ? null
              : NetworkImage(shopper.avatarUrl),
          child: shopper.avatarUrl.isEmpty
              ? const Icon(Icons.person, size: 36)
              : null,
        ),
        const SizedBox(height: 16),
        if (shopper.name.isNotEmpty)
          Text(shopper.name, style: theme.textTheme.headlineSmall),
        Text(shopper.email),
        if (shopper.authProvider.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            '${AppStrings.profileProviderLabel}: ${shopper.authProvider}',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ],
    );
  }
}
