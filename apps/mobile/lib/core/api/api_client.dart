import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../errors/api_failure.dart';

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
    final http.Response response;
    try {
      response = await _http
          .get(
            Uri.parse('$_baseUrl$path'),
            headers: {
              'Authorization': 'Bearer $bearerToken',
              'Accept': 'application/json',
            },
          )
          .timeout(timeout);
    } on TimeoutException {
      throw const NetworkApiFailure();
    } on SocketException {
      throw const NetworkApiFailure();
    } on http.ClientException {
      throw const NetworkApiFailure();
    }

    if (response.statusCode == 401) throw const UnauthorizedApiFailure();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ServerApiFailure(response.statusCode);
    }
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) return decoded;
    } on FormatException {
      // Falls through to the malformed failure below.
    }
    throw const MalformedResponseApiFailure();
  }
}
