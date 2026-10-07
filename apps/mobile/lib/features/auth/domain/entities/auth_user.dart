/// The signed-in shopper as known by the identity provider.
class AuthUser {
  const AuthUser({required this.id, required this.email, this.name});

  final String id;
  final String email;
  final String? name;

  @override
  bool operator ==(Object other) =>
      other is AuthUser &&
      other.id == id &&
      other.email == email &&
      other.name == name;

  @override
  int get hashCode => Object.hash(id, email, name);
}
