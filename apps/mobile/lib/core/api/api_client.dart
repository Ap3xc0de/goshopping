import 'dart:convert';

import 'package:http/http.dart' as http;

import '../errors/api_failure.dart';

/// Hosts where cleartext http is acceptable (local development only).
const _cleartextAllowedHosts = {'localhost', '127.0.0.1', '10.0.2.2'};

/// Minimal JSON client for the Core API. Throws `ApiFailure`s only.
class ApiClient {
  ApiClient({
    required String baseUrl,
    required http.Client httpClient,
    this.timeout = const Duration(seconds: 15),
  }) : _baseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), ''),
       _http = httpClient;

  final String _baseUrl;
  final http.Client _http;
  final Duration timeout;

  Future<Map<String, dynamic>> getJson(
    String path, {
    required String bearerToken,
  }) async {
    // Validate before anything is sent: the token must never leave the device
    // over cleartext to a non-local host, or to a URL we cannot even parse.
    final url = _resolve(path);

    final http.Response response;
    try {
      response = await _http
          .get(
            url,
            headers: {
              'Authorization': 'Bearer $bearerToken',
              'Accept': 'application/json',
            },
          )
          .timeout(timeout);
    } on ApiFailure {
      rethrow;
    } catch (_) {
      // Timeouts, sockets, TLS/handshake errors, `http.ClientException` and
      // anything else the transport may throw: all are connectivity failures.
      throw const NetworkApiFailure();
    }

    if (response.statusCode == 401) throw const UnauthorizedApiFailure();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ServerApiFailure(response.statusCode);
    }
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {
      // Invalid UTF-8, invalid JSON or any decode surprise: malformed.
    }
    throw const MalformedResponseApiFailure();
  }

  Uri _resolve(String path) {
    final Uri url;
    try {
      url = Uri.parse('$_baseUrl$path');
    } on FormatException {
      throw const InvalidUrlApiFailure();
    }
    final isHttp = url.scheme == 'http';
    if ((!isHttp && url.scheme != 'https') || url.host.isEmpty) {
      throw const InvalidUrlApiFailure();
    }
    if (isHttp && !_cleartextAllowedHosts.contains(url.host)) {
      throw const InsecureTransportApiFailure();
    }
    return url;
  }
}
