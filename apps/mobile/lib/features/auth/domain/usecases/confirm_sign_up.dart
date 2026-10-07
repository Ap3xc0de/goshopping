import '../repositories/auth_repository.dart';

class ConfirmSignUp {
  const ConfirmSignUp(this._repository);

  final AuthRepository _repository;

  Future<void> call({required String email, required String code}) =>
      _repository.confirmSignUp(email: email, code: code);
}
