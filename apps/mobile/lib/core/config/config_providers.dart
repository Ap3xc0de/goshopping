import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_config.dart';

/// Overridden in `main` with `AppConfig.fromEnvironment()`.
final appConfigProvider = Provider<AppConfig>((ref) => const AppConfig.empty());
