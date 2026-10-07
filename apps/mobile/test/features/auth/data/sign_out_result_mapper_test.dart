import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/features/auth/data/datasources/sign_out_result_mapper.dart';
import 'package:goshopping/features/auth/domain/entities/sign_out_outcome.dart';

void main() {
  test('a complete sign out is complete', () {
    expect(
      mapSignOutResult(const CognitoSignOutResult.complete()),
      SignOutOutcome.complete,
    );
  });

  test('a partial sign out (cleared locally, remote failed) is partial', () {
    expect(
      mapSignOutResult(
        const CognitoSignOutResult.partial(
          globalSignOutException: GlobalSignOutException(accessToken: 'secret'),
        ),
      ),
      SignOutOutcome.partial,
    );
  });

  test('a failed sign out is failed', () {
    expect(
      mapSignOutResult(
        CognitoSignOutResult.failed(const NetworkException('offline')),
      ),
      SignOutOutcome.failed,
    );
  });
}
