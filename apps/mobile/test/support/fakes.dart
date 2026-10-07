import 'package:goshopping/features/auth/domain/entities/auth_user.dart';
import 'package:goshopping/features/auth/domain/entities/social_provider.dart';
import 'package:goshopping/features/auth/data/datasources/auth_data_source.dart';
import 'package:goshopping/features/auth/domain/repositories/auth_repository.dart';

const testUser = AuthUser(id: 'sub-1', email: 'ana@example.com', name: 'Ana');

/// Records calls and optionally throws or delays, for use in any layer.
class FakeAuthDataSource implements AuthDataSource {
  final List<String> calls = [];
  Object? error;
  AuthUser? user = testUser;
  String? token = 'id-token';

  Future<void> _record(String call) async {
    calls.add(call);
    if (error != null) throw error!;
  }

  @override
  Future<void> signUp({
    required String email,
    required String password,
    String? name,
  }) => _record('signUp:$email:$password:${name ?? ''}');

  @override
  Future<void> confirmSignUp({required String email, required String code}) =>
      _record('confirmSignUp:$email:$code');

  @override
  Future<void> resendSignUpCode(String email) => _record('resend:$email');

  @override
  Future<AuthUser> signIn({
    required String email,
    required String password,
  }) async {
    await _record('signIn:$email:$password');
    return user!;
  }

  @override
  Future<AuthUser> signInWithSocial(SocialProvider provider) async {
    await _record('social:${provider.name}');
    return user!;
  }

  @override
  Future<void> signOut() => _record('signOut');

  @override
  Future<void> requestPasswordReset(String email) => _record('reset:$email');

  @override
  Future<void> confirmPasswordReset({
    required String email,
    required String code,
    required String newPassword,
  }) => _record('confirmReset:$email:$code:$newPassword');

  @override
  Future<AuthUser?> currentUser() async {
    await _record('currentUser');
    return user;
  }

  @override
  Future<String?> idToken() async {
    await _record('idToken');
    return token;
  }
}

/// Repository fake with completers-free simple behavior for controller tests.
class FakeAuthRepository implements AuthRepository {
  final List<String> calls = [];
  Object? error;
  AuthUser? user = testUser;
  String? token = 'id-token';
  Future<void> Function()? gate;

  Future<void> _record(String call) async {
    calls.add(call);
    if (gate != null) await gate!();
    if (error != null) throw error!;
  }

  @override
  Future<void> signUp({
    required String email,
    required String password,
    String? name,
  }) => _record('signUp:$email');

  @override
  Future<void> confirmSignUp({required String email, required String code}) =>
      _record('confirmSignUp:$email:$code');

  @override
  Future<void> resendSignUpCode(String email) => _record('resend:$email');

  @override
  Future<AuthUser> signIn({
    required String email,
    required String password,
  }) async {
    await _record('signIn:$email');
    return user!;
  }

  @override
  Future<AuthUser> signInWithSocial(SocialProvider provider) async {
    await _record('social:${provider.name}');
    return user!;
  }

  @override
  Future<void> signOut() => _record('signOut');

  @override
  Future<void> requestPasswordReset(String email) => _record('reset:$email');

  @override
  Future<void> confirmPasswordReset({
    required String email,
    required String code,
    required String newPassword,
  }) => _record('confirmReset:$email:$code');

  @override
  Future<AuthUser?> restoreSession() async {
    await _record('restore');
    return user;
  }

  @override
  Future<String?> idToken() async {
    await _record('idToken');
    return token;
  }
}
