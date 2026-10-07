import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/api/api_client.dart';
import 'package:goshopping/core/errors/api_failure.dart';
import 'package:goshopping/features/auth/presentation/providers.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../../../support/fakes.dart';
import '../../../support/pump_app.dart';

ProviderContainer containerWith(
  FakeAuthRepository repo,
  http.Client client, {
  Duration timeout = const Duration(milliseconds: 50),
}) {
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(repo),
      apiClientProvider.overrideWithValue(
        ApiClient(
          baseUrl: 'https://api.test',
          httpClient: client,
          timeout: timeout,
        ),
      ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  group('shopperProvider', () {
    test('loads the profile with the ID token', () async {
      final container = containerWith(
        FakeAuthRepository(),
        MockClient((req) async {
          expect(req.headers['Authorization'], 'Bearer id-token');
          return http.Response(meBody, 200);
        }),
      );
      expect(
        (await container.read(shopperProvider.future)).name,
        'Ana Shopper',
      );
    });

    test('a hanging /me call times out as a network failure', () async {
      final container = containerWith(
        FakeAuthRepository(),
        MockClient((_) => Completer<http.Response>().future),
      );
      await expectLater(
        container.read(shopperProvider.future),
        throwsA(isA<NetworkApiFailure>()),
      );
    });

    test('a hanging token fetch times out as a network failure', () async {
      final repo = FakeAuthRepository()
        ..gate = (() => Completer<void>().future);
      final container = containerWith(
        repo,
        MockClient((_) async => http.Response(meBody, 200)),
      );
      await expectLater(
        container.read(shopperProvider.future),
        throwsA(isA<NetworkApiFailure>()),
      );
    });

    test('a failure is not retried automatically', () async {
      var calls = 0;
      final container = containerWith(
        FakeAuthRepository(),
        MockClient((_) async {
          calls++;
          return http.Response('', 503);
        }),
      );
      await expectLater(
        container.read(shopperProvider.future),
        throwsA(isA<ServerApiFailure>()),
      );
      await Future<void>.delayed(const Duration(seconds: 2));
      expect(calls, 1);
    });
  });
}
