import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/config/app_config.dart';

void main() {
  const configured = AppConfig(
    userPoolId: 'us-east-1_abc',
    appClientId: 'client123',
    region: 'us-east-1',
    hostedUiDomain: 'example.auth.us-east-1.amazoncognito.com',
    apiBaseUrl: 'http://localhost:3000',
  );

  group('AppConfig.isCognitoConfigured', () {
    test('is true when every Cognito value is present', () {
      expect(configured.isCognitoConfigured, isTrue);
    });

    test('is false when any Cognito value is empty', () {
      expect(
        const AppConfig(
          userPoolId: '',
          appClientId: 'c',
          region: 'r',
          hostedUiDomain: 'd',
          apiBaseUrl: 'http://x',
        ).isCognitoConfigured,
        isFalse,
      );
      expect(const AppConfig.empty().isCognitoConfigured, isFalse);
    });

    test('treats whitespace-only values as missing', () {
      expect(
        const AppConfig(
          userPoolId: '  ',
          appClientId: 'c',
          region: 'r',
          hostedUiDomain: 'd',
          apiBaseUrl: 'http://x',
        ).isCognitoConfigured,
        isFalse,
      );
    });
  });

  group('AppConfig defaults', () {
    test('empty config points the API at localhost', () {
      expect(const AppConfig.empty().apiBaseUrl, 'http://localhost:3000');
    });

    test('exposes the deep link redirect URIs', () {
      expect(AppConfig.signInRedirectUri, 'goshopping://auth/callback');
      expect(AppConfig.signOutRedirectUri, 'goshopping://auth/signout');
    });
  });

  group('AppConfig.toAmplifyConfigJson', () {
    late Map<String, dynamic> plugin;

    setUp(() {
      final json = jsonDecode(configured.toAmplifyConfigJson());
      plugin =
          json['auth']['plugins']['awsCognitoAuthPlugin']
              as Map<String, dynamic>;
    });

    test('contains the user pool values', () {
      final pool = plugin['CognitoUserPool']['Default'] as Map;
      expect(pool['PoolId'], 'us-east-1_abc');
      expect(pool['AppClientId'], 'client123');
      expect(pool['Region'], 'us-east-1');
    });

    test('contains the OAuth settings', () {
      final oauth = plugin['Auth']['Default']['OAuth'] as Map;
      expect(oauth['WebDomain'], 'example.auth.us-east-1.amazoncognito.com');
      expect(oauth['AppClientId'], 'client123');
      expect(oauth['SignInRedirectURI'], 'goshopping://auth/callback');
      expect(oauth['SignOutRedirectURI'], 'goshopping://auth/signout');
      expect(oauth['Scopes'], ['openid', 'email', 'profile']);
    });

    test('strips an https scheme and trailing slash from the domain', () {
      const withScheme = AppConfig(
        userPoolId: 'p',
        appClientId: 'c',
        region: 'r',
        hostedUiDomain: 'https://dom.example.com/',
        apiBaseUrl: 'http://x',
      );
      final json = jsonDecode(withScheme.toAmplifyConfigJson());
      final oauth =
          json['auth']['plugins']['awsCognitoAuthPlugin']['Auth']['Default']['OAuth']
              as Map;
      expect(oauth['WebDomain'], 'dom.example.com');
    });
  });
}
