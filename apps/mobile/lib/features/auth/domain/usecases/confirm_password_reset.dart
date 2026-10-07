import '../repositories/auth_repository.dart';

class ConfirmPasswordReset {
  const ConfirmPasswordReset(this._repository);

  final AuthRepository _repository;

  Future<void> call({
    required String email,
    required String code,
    required String newPassword,
  }) => _repository.confirmPasswordReset(
    email: email,
    code: code,
    newPassword: newPassword,
  );
}
