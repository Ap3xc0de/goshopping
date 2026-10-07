import '../../../../core/api/api_client.dart';
import '../../../../core/errors/api_failure.dart';
import '../models/shopper.dart';

/// Reads the shopper profile from the Core API.
class ShopperRemoteDataSource {
  const ShopperRemoteDataSource(this._api);

  final ApiClient _api;

  Future<Shopper> fetchMe(String idToken) async {
    final json = await _api.getJson('/me', bearerToken: idToken);
    try {
      return Shopper.fromJson(json);
    } on FormatException {
      throw const MalformedResponseApiFailure();
    }
  }
}
