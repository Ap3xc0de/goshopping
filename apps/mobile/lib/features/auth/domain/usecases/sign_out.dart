import '../entities/sign_out_outcome.dart';
import '../repositories/auth_repository.dart';

class SignOut {
  const SignOut(this._repository);

  final AuthRepository _repository;

  Future<SignOutOutcome> call() => _repository.signOut();
}
