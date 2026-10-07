# Goshopping shopper app

Flutter app for shoppers (iOS and Android). Clean Architecture, feature-first:

```
lib/
  core/        config, strings, theme, router, API client
  features/
    auth/      domain, data, presentation
```

State management: Riverpod. Routing: go_router. Authentication: Amazon Cognito
through Amplify Flutter (email + password, and Google / Apple / Facebook through
the Cognito Hosted UI).

## Configuration

No real values are stored in the repository. Pass them at build/run time with
`--dart-define`:

| Define | Description | Default |
| --- | --- | --- |
| `COGNITO_USER_POOL_ID` | Shopper user pool id | empty |
| `COGNITO_APP_CLIENT_ID` | Mobile app client id | empty |
| `COGNITO_REGION` | Pool region | empty |
| `COGNITO_HOSTED_UI_DOMAIN` | Hosted UI domain (host only) | empty |
| `API_BASE_URL` | Core API base URL | `http://localhost:3000` |

If any Cognito value is missing the app shows an "authentication not configured"
screen instead of starting Amplify.

On the **Android emulator** the host machine is `10.0.2.2`, so use
`--dart-define=API_BASE_URL=http://10.0.2.2:3000`.

```sh
flutter run \
  --dart-define=COGNITO_USER_POOL_ID=<pool-id> \
  --dart-define=COGNITO_APP_CLIENT_ID=<client-id> \
  --dart-define=COGNITO_REGION=<region> \
  --dart-define=COGNITO_HOSTED_UI_DOMAIN=<prefix>.auth.<region>.amazoncognito.com
```

Deep links (must match the Cognito app client callback/logout URLs):
`goshopping://auth/callback` and `goshopping://auth/signout`.

## Development

```sh
flutter pub get
flutter analyze
dart format --output=none --set-exit-if-changed .
flutter test
```

Requirements: Amplify Auth needs iOS 13+ (the project targets 15.0) and Android
`minSdk` 24.
