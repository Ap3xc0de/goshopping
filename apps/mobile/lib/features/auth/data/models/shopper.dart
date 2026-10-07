/// Shopper profile returned by `GET /me`.
class Shopper {
  const Shopper({
    required this.id,
    required this.email,
    required this.name,
    required this.avatarUrl,
    required this.authProvider,
    required this.createdAt,
  });

  factory Shopper.fromJson(Map<String, dynamic> json) {
    String required(String key) {
      final value = json[key];
      if (value is String && value.isNotEmpty) return value;
      throw FormatException('Missing or invalid "$key"');
    }

    String optional(String key) {
      final value = json[key];
      if (value == null) return '';
      if (value is String) return value;
      throw FormatException('Invalid "$key"');
    }

    return Shopper(
      id: required('id'),
      email: required('email'),
      name: optional('name'),
      avatarUrl: optional('avatar_url'),
      authProvider: optional('auth_provider'),
      createdAt: DateTime.parse(required('created_at')),
    );
  }

  final String id;
  final String email;
  final String name;
  final String avatarUrl;
  final String authProvider;
  final DateTime createdAt;
}
