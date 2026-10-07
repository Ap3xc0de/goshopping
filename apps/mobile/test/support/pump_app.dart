import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/app.dart';
import 'package:goshopping/core/config/app_config.dart';
import 'package:goshopping/core/config/config_providers.dart';
import 'package:goshopping/features/auth/domain/entities/social_provider.dart';
import 'package:goshopping/features/auth/presentation/providers.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'fakes.dart';

const configuredAppConfig = AppConfig(
  userPoolId: 'us-east-1_test',
  appClientId: 'client',
  region: 'us-east-1',
  hostedUiDomain: 'test.auth.us-east-1.amazoncognito.com',
  apiBaseUrl: 'https://api.test',
);

const meBody =
    '{"id":"s-1","email":"ana@example.com","name":"Ana Shopper",'
    '"avatar_url":"","auth_provider":"cognito",'
    '"created_at":"2024-01-15T10:00:00Z"}';

/// Boots the real app with fakes: no network, no Amplify plugin calls.
Future<FakeAuthRepository> pumpApp(
  WidgetTester tester, {
  FakeAuthRepository? repo,
  AppConfig config = configuredAppConfig,
  List<SocialProvider> social = SocialProvider.values,
  http.Client? httpClient,
}) async {
  tester.view.physicalSize = const Size(800, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final fake = repo ?? (FakeAuthRepository()..user = null);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(fake),
        appConfigProvider.overrideWithValue(config),
        socialProvidersProvider.overrideWithValue(social),
        httpClientProvider.overrideWithValue(
          httpClient ?? MockClient((_) async => http.Response(meBody, 200)),
        ),
      ],
      child: const GoshoppingApp(),
    ),
  );
  await tester.pumpAndSettle();
  return fake;
}

/// Blocks repository calls until [release] is called.
class Gate {
  final _completer = Completer<void>();
  Future<void> call() => _completer.future;
  void release() => _completer.complete();
}

Future<void> enter(WidgetTester tester, Key key, String text) async {
  await tester.enterText(find.byKey(key), text);
  await tester.pump();
}

bool isEnabled(WidgetTester tester, Key key) {
  final button = tester.widget<ButtonStyleButton>(find.byKey(key));
  return button.onPressed != null;
}

bool isObscured(WidgetTester tester, Key key) {
  final field = tester.widget<TextField>(
    find.descendant(of: find.byKey(key), matching: find.byType(TextField)),
  );
  return field.obscureText;
}
