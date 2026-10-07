import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/config/app_config.dart';
import 'core/config/config_providers.dart';
import 'core/config/startup_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final config = await resolveStartupConfig(
    AppConfig.fromEnvironment(),
    configure: _configureAmplify,
  );

  runApp(
    ProviderScope(
      overrides: [appConfigProvider.overrideWithValue(config)],
      child: const GoshoppingApp(),
    ),
  );
}

Future<bool> _configureAmplify(AppConfig config) async {
  try {
    if (!Amplify.isConfigured) {
      await Amplify.addPlugin(AmplifyAuthCognito());
      await Amplify.configure(config.toAmplifyConfigJson());
    }
    return true;
  } on AmplifyAlreadyConfiguredException {
    return true;
  } catch (error) {
    debugPrint('Amplify configuration failed: ${error.runtimeType}');
    return false;
  }
}
