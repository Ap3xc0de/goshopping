import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/config/app_config.dart';
import 'package:goshopping/core/config/startup_config.dart';

import '../../support/pump_app.dart';

void main() {
  test('keeps the configuration when Amplify configures fine', () async {
    final result = await resolveStartupConfig(
      configuredAppConfig,
      configure: (_) async => true,
    );
    expect(result, same(configuredAppConfig));
    expect(result.isCognitoConfigured, isTrue);
  });

  test(
    'falls back to the not-configured config when configure fails',
    () async {
      final result = await resolveStartupConfig(
        configuredAppConfig,
        configure: (_) async => false,
      );
      expect(result.isCognitoConfigured, isFalse);
    },
  );

  test('falls back when configure throws (startup must not crash)', () async {
    final result = await resolveStartupConfig(
      configuredAppConfig,
      configure: (_) async => throw StateError('boom'),
    );
    expect(result.isCognitoConfigured, isFalse);
  });

  test('never calls Amplify when Cognito is not configured', () async {
    var called = false;
    final result = await resolveStartupConfig(
      const AppConfig.empty(),
      configure: (_) async {
        called = true;
        return true;
      },
    );
    expect(called, isFalse);
    expect(result.isCognitoConfigured, isFalse);
  });
}
