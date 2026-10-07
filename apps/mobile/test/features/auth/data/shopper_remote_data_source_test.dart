import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/api/api_client.dart';
import 'package:goshopping/core/errors/api_failure.dart';
import 'package:goshopping/features/auth/data/datasources/shopper_remote_data_source.dart';
import 'package:goshopping/features/auth/data/models/shopper.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

ShopperRemoteDataSource sourceFor(http.Response Function(http.Request) h) =>
    ShopperRemoteDataSource(
      ApiClient(
        baseUrl: 'https://api.test',
        httpClient: MockClient((r) async => h(r)),
      ),
    );

const _body = '''
{"id":"u-1","email":"ana@example.com","name":"Ana","avatar_url":"http://x/a.png",
 "auth_provider":"cognito","created_at":"2024-01-15T10:00:00Z"}
''';

void main() {
  group('Shopper.fromJson', () {
    test('parses every field', () {
      final s = Shopper.fromJson({
        'id': 'u-1',
        'email': 'ana@example.com',
        'name': 'Ana',
        'avatar_url': 'http://x/a.png',
        'auth_provider': 'cognito',
        'created_at': '2024-01-15T10:00:00Z',
      });
      expect(s.id, 'u-1');
      expect(s.email, 'ana@example.com');
      expect(s.name, 'Ana');
      expect(s.avatarUrl, 'http://x/a.png');
      expect(s.authProvider, 'cognito');
      expect(s.createdAt, DateTime.utc(2024, 1, 15, 10));
    });

    test('defaults optional fields when null or missing', () {
      final s = Shopper.fromJson({
        'id': 'u-1',
        'email': 'a@b.co',
        'name': null,
        'created_at': '2024-01-15T10:00:00Z',
      });
      expect(s.name, '');
      expect(s.avatarUrl, '');
      expect(s.authProvider, '');
    });

    test('throws FormatException when required fields are missing or bad', () {
      expect(
        () => Shopper.fromJson({'email': 'a@b.co'}),
        throwsFormatException,
      );
      expect(
        () => Shopper.fromJson({
          'id': 'x',
          'email': 'a@b.co',
          'created_at': 'not-a-date',
        }),
        throwsFormatException,
      );
      expect(
        () => Shopper.fromJson({'id': 1, 'email': 'a', 'created_at': 'x'}),
        throwsFormatException,
      );
    });
  });

  group('ShopperRemoteDataSource.fetchMe', () {
    test('calls GET /me with the token and parses the shopper', () async {
      late http.Request seen;
      final s = await sourceFor((r) {
        seen = r;
        return http.Response(_body, 200);
      }).fetchMe('id-token');
      expect(s.email, 'ana@example.com');
      expect(seen.url.path, '/me');
      expect(seen.headers['Authorization'], 'Bearer id-token');
    });

    test('401 -> UnauthorizedApiFailure', () {
      expect(
        () => sourceFor((_) => http.Response('', 401)).fetchMe('t'),
        throwsA(isA<UnauthorizedApiFailure>()),
      );
    });

    test('valid JSON with the wrong shape -> MalformedResponseApiFailure', () {
      expect(
        () => sourceFor((_) => http.Response('{"foo":1}', 200)).fetchMe('t'),
        throwsA(isA<MalformedResponseApiFailure>()),
      );
    });

    test('malformed JSON -> MalformedResponseApiFailure', () {
      expect(
        () => sourceFor((_) => http.Response('<html>', 200)).fetchMe('t'),
        throwsA(isA<MalformedResponseApiFailure>()),
      );
    });
  });
}
