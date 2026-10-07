import '../repositories/auth_repository.dart';

class GetIdToken {
  const GetIdToken(this._repository);

  final AuthRepository _repository;

  Future<String?> call() => _repository.idToken();
}
