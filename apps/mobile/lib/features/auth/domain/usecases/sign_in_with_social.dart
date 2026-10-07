import '../repositories/auth_repository.dart';
import '../entities/auth_user.dart';
import '../entities/social_provider.dart';

class SignInWithSocial {
  const SignInWithSocial(this._repository);

  final AuthRepository _repository;

  Future<AuthUser> call(SocialProvider provider) =>
      _repository.signInWithSocial(provider);
}
