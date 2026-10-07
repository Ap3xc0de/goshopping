import '../repositories/auth_repository.dart';

class ResendSignUpCode {
  const ResendSignUpCode(this._repository);

  final AuthRepository _repository;

  Future<void> call(String email) => _repository.resendSignUpCode(email);
}
