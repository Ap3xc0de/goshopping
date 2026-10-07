import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/features/auth/domain/entities/sign_out_outcome.dart';
import 'package:goshopping/features/auth/domain/entities/social_provider.dart';
import 'package:goshopping/features/auth/domain/failures/auth_failure.dart';
import 'package:goshopping/features/auth/domain/usecases/confirm_password_reset.dart';
import 'package:goshopping/features/auth/domain/usecases/confirm_sign_up.dart';
import 'package:goshopping/features/auth/domain/usecases/get_id_token.dart';
import 'package:goshopping/features/auth/domain/usecases/request_password_reset.dart';
import 'package:goshopping/features/auth/domain/usecases/resend_sign_up_code.dart';
import 'package:goshopping/features/auth/domain/usecases/restore_session.dart';
import 'package:goshopping/features/auth/domain/usecases/sign_in.dart';
import 'package:goshopping/features/auth/domain/usecases/sign_in_with_social.dart';
import 'package:goshopping/features/auth/domain/usecases/sign_out.dart';
import 'package:goshopping/features/auth/domain/usecases/sign_up.dart';

import '../../../support/fakes.dart';

void main() {
  late FakeAuthRepository repo;
  setUp(() => repo = FakeAuthRepository());

  test('SignUp delegates to the repository', () async {
    await SignUp(repo)(email: 'a@b.co', password: 'Abcdef12', name: 'Ana');
    expect(repo.calls, ['signUp:a@b.co']);
  });

  test('ConfirmSignUp delegates', () async {
    await ConfirmSignUp(repo)(email: 'a@b.co', code: '123456');
    expect(repo.calls, ['confirmSignUp:a@b.co:123456']);
  });

  test('ResendSignUpCode delegates', () async {
    await ResendSignUpCode(repo)('a@b.co');
    expect(repo.calls, ['resend:a@b.co']);
  });

  test('SignIn returns the user', () async {
    final user = await SignIn(repo)(email: 'a@b.co', password: 'x');
    expect(user, testUser);
    expect(repo.calls, ['signIn:a@b.co']);
  });

  test('SignInWithSocial passes the provider', () async {
    for (final p in SocialProvider.values) {
      await SignInWithSocial(repo)(p);
    }
    expect(repo.calls, ['social:google', 'social:apple', 'social:facebook']);
  });

  test('SignOut delegates', () async {
    repo.signOutOutcome = SignOutOutcome.partial;
    expect(await SignOut(repo)(), SignOutOutcome.partial);
    expect(repo.calls, ['signOut']);
  });

  test('RequestPasswordReset and ConfirmPasswordReset delegate', () async {
    await RequestPasswordReset(repo)('a@b.co');
    await ConfirmPasswordReset(repo)(
      email: 'a@b.co',
      code: '123456',
      newPassword: 'Abcdef12',
    );
    expect(repo.calls, ['reset:a@b.co', 'confirmReset:a@b.co:123456']);
  });

  test('RestoreSession returns the current user or null', () async {
    expect(await RestoreSession(repo)(), testUser);
    repo.user = null;
    expect(await RestoreSession(repo)(), isNull);
  });

  test('GetIdToken returns the token', () async {
    expect(await GetIdToken(repo)(), 'id-token');
  });

  test('failures propagate unchanged', () async {
    repo.error = const InvalidCredentialsFailure();
    expect(
      () => SignIn(repo)(email: 'a@b.co', password: 'x'),
      throwsA(isA<InvalidCredentialsFailure>()),
    );
  });
}
