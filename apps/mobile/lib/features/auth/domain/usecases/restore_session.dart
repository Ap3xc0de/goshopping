import '../repositories/auth_repository.dart';
import '../entities/auth_user.dart';

class RestoreSession {
  const RestoreSession(this._repository);

  final AuthRepository _repository;

  Future<AuthUser?> call() => _repository.restoreSession();
}
