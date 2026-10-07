import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/api/api_client.dart';
import 'package:goshopping/core/errors/api_failure.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

ApiClient clientFor(
  Future<http.Response> Function(http.Request) handler, {
  Duration timeout = const Duration(seconds: 1),
}) => ApiClient(
  baseUrl: 'https://api.test',
  httpClient: MockClient(handler),
  timeout: timeout,
);

void main() {
  test(
    'sends a bearer token to the right URL and returns decoded JSON',
    () async {
      late http.Request seen;
      final client = clientFor((req) async {
        seen = req;
        return http.Response('{"id":"1"}', 200);
      });

      final json = await client.getJson('/me', bearerToken: 'tok');

      expect(json, {'id': '1'});
      expect(seen.method, 'GET');
      expect(seen.url.toString(), 'https://api.test/me');
      expect(seen.headers['Authorization'], 'Bearer tok');
      expect(seen.headers['Accept'], 'application/json');
    },
  );

  test('tolerates a trailing slash in the base URL', () async {
    late Uri url;
    final client = ApiClient(
      baseUrl: 'https://api.test/',
      httpClient: MockClient((req) async {
        url = req.url;
        return http.Response('{}', 200);
      }),
    );
    await client.getJson('/me', bearerToken: 't');
    expect(url.toString(), 'https://api.test/me');
  });

  test('401 becomes UnauthorizedApiFailure', () {
    final client = clientFor((_) async => http.Response('nope', 401));
    expect(
      () => client.getJson('/me', bearerToken: 't'),
      throwsA(isA<UnauthorizedApiFailure>()),
    );
  });

  test('5xx and other statuses become ServerApiFailure with the status', () {
    final client = clientFor((_) async => http.Response('boom', 503));
    expect(
      () => client.getJson('/me', bearerToken: 't'),
      throwsA(
        isA<ServerApiFailure>().having((f) => f.statusCode, 'status', 503),
      ),
    );
  });

  test('malformed JSON becomes MalformedResponseApiFailure', () {
    final client = clientFor((_) async => http.Response('not json', 200));
    expect(
      () => client.getJson('/me', bearerToken: 't'),
      throwsA(isA<MalformedResponseApiFailure>()),
    );
  });

  test('a JSON array (not an object) is malformed', () {
    final client = clientFor((_) async => http.Response('[1]', 200));
    expect(
      () => client.getJson('/me', bearerToken: 't'),
      throwsA(isA<MalformedResponseApiFailure>()),
    );
  });

  test('timeouts become NetworkApiFailure', () {
    final client = clientFor(
      (_) => Completer<http.Response>().future,
      timeout: const Duration(milliseconds: 20),
    );
    expect(
      () => client.getJson('/me', bearerToken: 't'),
      throwsA(isA<NetworkApiFailure>()),
    );
  });

  test('socket errors become NetworkApiFailure', () {
    final client = clientFor((_) async => throw const SocketException('down'));
    expect(
      () => client.getJson('/me', bearerToken: 't'),
      throwsA(isA<NetworkApiFailure>()),
    );
    final client2 = clientFor((_) async => throw http.ClientException('x'));
    expect(
      () => client2.getJson('/me', bearerToken: 't'),
      throwsA(isA<NetworkApiFailure>()),
    );
  });

  test('handles UTF-8 bodies', () async {
    final client = clientFor(
      (_) async => http.Response.bytes(
        utf8.encode('{"name":"Ñandú"}'),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      ),
    );
    expect((await client.getJson('/me', bearerToken: 't'))['name'], 'Ñandú');
  });

  group('hardening', () {
    test('an invalid UTF-8 body is a MalformedResponseApiFailure', () {
      final client = clientFor(
        (_) async => http.Response.bytes([0x7b, 0xff, 0xfe, 0x7d], 200),
      );
      expect(
        () => client.getJson('/me', bearerToken: 't'),
        throwsA(isA<MalformedResponseApiFailure>()),
      );
    });

    test('a malformed base URL never escapes as a FormatException', () {
      for (final base in ['http://[bad', 'not a url', '', 'ftp://host']) {
        var sent = false;
        final client = ApiClient(
          baseUrl: base,
          httpClient: MockClient((_) async {
            sent = true;
            return http.Response('{}', 200);
          }),
        );
        expect(
          () => client.getJson('/me', bearerToken: 't'),
          throwsA(isA<InvalidUrlApiFailure>()),
          reason: base,
        );
        expect(sent, isFalse, reason: base);
      }
    });

    test('a malformed path is an InvalidUrlApiFailure', () {
      final client = clientFor((_) async => http.Response('{}', 200));
      expect(
        () => client.getJson(':bad[port', bearerToken: 't'),
        throwsA(isA<InvalidUrlApiFailure>()),
      );
    });

    test('TLS and handshake errors become NetworkApiFailure', () {
      for (final error in <Object>[
        const HandshakeException('bad cert'),
        const TlsException('tls'),
        const CertificateException('cert'),
      ]) {
        final client = clientFor((_) async => throw error);
        expect(
          () => client.getJson('/me', bearerToken: 't'),
          throwsA(isA<NetworkApiFailure>()),
          reason: '$error',
        );
      }
    });

    test('any other unexpected transport error becomes NetworkApiFailure', () {
      final client = clientFor((_) async => throw StateError('weird'));
      expect(
        () => client.getJson('/me', bearerToken: 't'),
        throwsA(isA<NetworkApiFailure>()),
      );
    });

    test('refuses a bearer token over cleartext to a non-local host', () async {
      for (final base in [
        'http://api.example.com',
        'http://10.0.0.5:3000',
        'http://localhost.evil.com',
      ]) {
        var sent = false;
        final client = ApiClient(
          baseUrl: base,
          httpClient: MockClient((_) async {
            sent = true;
            return http.Response('{}', 200);
          }),
        );
        await expectLater(
          client.getJson('/me', bearerToken: 'secret'),
          throwsA(isA<InsecureTransportApiFailure>()),
          reason: base,
        );
        expect(sent, isFalse, reason: base);
      }
    });

    test('allows cleartext http to local development hosts', () async {
      for (final base in [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://10.0.2.2:3000',
      ]) {
        final client = ApiClient(
          baseUrl: base,
          httpClient: MockClient((_) async => http.Response('{"ok":1}', 200)),
        );
        expect(await client.getJson('/me', bearerToken: 't'), {'ok': 1});
      }
    });

    test('allows https to any host', () async {
      final client = ApiClient(
        baseUrl: 'https://api.example.com',
        httpClient: MockClient((_) async => http.Response('{}', 200)),
      );
      expect(await client.getJson('/me', bearerToken: 't'), isEmpty);
    });
  });
}
