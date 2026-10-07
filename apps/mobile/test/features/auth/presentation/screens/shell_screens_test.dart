import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/config/app_config.dart';
import 'package:goshopping/core/strings/app_strings.dart';
import 'package:goshopping/features/auth/presentation/auth_keys.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../../../../support/fakes.dart';
import '../../../../support/pump_app.dart';

void main() {
  group('not configured', () {
    testWidgets('shows a clear message and never touches auth', (tester) async {
      final repo = await pumpApp(tester, config: const AppConfig.empty());
      expect(find.text(AppStrings.notConfiguredTitle), findsOneWidget);
      expect(find.text(AppStrings.notConfiguredBody), findsOneWidget);
      expect(find.byKey(AuthKeys.email), findsNothing);
      expect(repo.calls, isEmpty);
    });
  });

  group('home', () {
    testWidgets('restores the session and shows the /me profile', (
      tester,
    ) async {
      await pumpApp(tester, repo: FakeAuthRepository());
      expect(find.text(AppStrings.homeTitle), findsOneWidget);
      expect(find.text('Ana Shopper'), findsOneWidget);
      expect(find.text('ana@example.com'), findsOneWidget);
    });

    testWidgets('sign out returns to the welcome screen', (tester) async {
      final repo = await pumpApp(tester, repo: FakeAuthRepository());
      await tester.tap(find.text(AppStrings.signOut));
      await tester.pumpAndSettle();
      expect(repo.calls, contains('signOut'));
      expect(find.byKey(AuthKeys.email), findsOneWidget);
    });

    testWidgets('a /me failure shows an error with retry, not a crash', (
      tester,
    ) async {
      var attempts = 0;
      await pumpApp(
        tester,
        repo: FakeAuthRepository(),
        httpClient: MockClient((_) async {
          attempts++;
          return attempts == 1
              ? http.Response('', 503)
              : http.Response(meBody, 200);
        }),
      );
      expect(find.text(AppStrings.profileLoadError), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await tester.pumpAndSettle();
      expect(find.text('Ana Shopper'), findsOneWidget);
    });
  });
}
