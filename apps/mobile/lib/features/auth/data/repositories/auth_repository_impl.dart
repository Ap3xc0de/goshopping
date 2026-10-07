import 'dart:async';
import 'dart:io';

import '../../domain/entities/auth_user.dart';
import '../../domain/entities/social_provider.dart';
import '../../domain/failures/auth_failure.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_data_source.dart';

/// Normalizes input, delegates to the data source and guarantees that only
/// `AuthFailure`s escape.
class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl(this._source);

  final AuthDataSource _source;

  static String _email(String value) => value.trim().toLowerCase();

  Future<T> _guard<T>(Future<T> Function() action) async {
    try {
      return await action();
    } on AuthFailure {
      rethrow;
    } on SocketException {
      throw const NetworkFailure();
    } on TimeoutException {
      throw const NetworkFailure();
    } catch (_) {
      throw const UnknownFailure();
    }
  }

  @override
  Future<void> signUp({
    required String email,
    required String password,
    String? name,
  }) {
    final trimmed = name?.trim();
    return _guard(
      () => _source.signUp(
        email: _email(email),
        password: password,
        name: (trimmed == null || trimmed.isEmpty) ? null : trimmed,
      ),
    );
  }

  @override
  Future<void> confirmSignUp({required String email, required String code}) =>
      _guard(
        () => _source.confirmSignUp(email: _email(email), code: code.trim()),
      );

  @override
  Future<void> resendSignUpCode(String email) =>
      _guard(() => _source.resendSignUpCode(_email(email)));

  @override
  Future<AuthUser> signIn({required String email, required String password}) =>
      _guard(() => _source.signIn(email: _email(email), password: password));

  @override
  Future<AuthUser> signInWithSocial(SocialProvider provider) =>
      _guard(() => _source.signInWithSocial(provider));

  @override
  Future<void> signOut() => _guard(_source.signOut);

  @override
  Future<void> requestPasswordReset(String email) =>
      _guard(() => _source.requestPasswordReset(_email(email)));

  @override
  Future<void> confirmPasswordReset({
    required String email,
    required String code,
    required String newPassword,
  }) => _guard(
    () => _source.confirmPasswordReset(
      email: _email(email),
      code: code.trim(),
      newPassword: newPassword,
    ),
  );

  @override
  Future<AuthUser?> restoreSession() => _guard(_source.currentUser);

  @override
  Future<String?> idToken() => _guard(_source.idToken);
}
