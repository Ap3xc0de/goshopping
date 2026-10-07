import 'dart:convert';

/// Compile-time configuration, provided with `--dart-define`.
///
/// No real values live in the repository. See the app README for the list of
/// defines.
class AppConfig {
  const AppConfig({
    required this.userPoolId,
    required this.appClientId,
    required this.region,
    required this.hostedUiDomain,
    required this.apiBaseUrl,
  });

  /// Configuration with no Cognito values (authentication not configured).
  const AppConfig.empty()
    : userPoolId = '',
      appClientId = '',
      region = '',
      hostedUiDomain = '',
      apiBaseUrl = defaultApiBaseUrl;

  /// Reads the values from `--dart-define`.
  factory AppConfig.fromEnvironment() => const AppConfig(
    userPoolId: String.fromEnvironment('COGNITO_USER_POOL_ID'),
    appClientId: String.fromEnvironment('COGNITO_APP_CLIENT_ID'),
    region: String.fromEnvironment('COGNITO_REGION'),
    hostedUiDomain: String.fromEnvironment('COGNITO_HOSTED_UI_DOMAIN'),
    apiBaseUrl: String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: defaultApiBaseUrl,
    ),
  );

  /// On the Android emulator the host machine is reachable at 10.0.2.2.
  static const defaultApiBaseUrl = 'http://localhost:3000';

  /// Deep links registered in the Cognito app client (Terraform defaults).
  static const signInRedirectUri = 'goshopping://auth/callback';
  static const signOutRedirectUri = 'goshopping://auth/signout';

  static const oauthScopes = ['openid', 'email', 'profile'];

  final String userPoolId;
  final String appClientId;
  final String region;
  final String hostedUiDomain;
  final String apiBaseUrl;

  bool get isCognitoConfigured => [
    userPoolId,
    appClientId,
    region,
    hostedUiDomain,
  ].every((value) => value.trim().isNotEmpty);

  /// Hosted UI host without scheme or trailing slash, as Amplify expects.
  String get _webDomain => hostedUiDomain
      .trim()
      .replaceFirst(RegExp(r'^https?://'), '')
      .replaceFirst(RegExp(r'/+$'), '');

  /// Builds the Amplify configuration JSON from the compile-time values.
  String toAmplifyConfigJson() => jsonEncode({
    'UserAgent': 'aws-amplify-cli/2.0',
    'Version': '1.0',
    'auth': {
      'plugins': {
        'awsCognitoAuthPlugin': {
          'UserAgent': 'aws-amplify-cli/0.1.0',
          'Version': '0.1.0',
          'IdentityManager': {'Default': <String, dynamic>{}},
          'CognitoUserPool': {
            'Default': {
              'PoolId': userPoolId.trim(),
              'AppClientId': appClientId.trim(),
              'Region': region.trim(),
            },
          },
          'Auth': {
            'Default': {
              'authenticationFlowType': 'USER_SRP_AUTH',
              'OAuth': {
                'WebDomain': _webDomain,
                'AppClientId': appClientId.trim(),
                'SignInRedirectURI': signInRedirectUri,
                'SignOutRedirectURI': signOutRedirectUri,
                'Scopes': oauthScopes,
              },
            },
          },
        },
      },
    },
  });
}
