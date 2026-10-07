import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';

import '../../domain/entities/sign_out_outcome.dart';

/// Maps Amplify's sign-out result to the domain outcome.
///
/// Anything that is not positively known to be complete or partial counts as
/// failed, so the user is told the truth instead of assuming success.
SignOutOutcome mapSignOutResult(SignOutResult result) => switch (result) {
  CognitoCompleteSignOut() => SignOutOutcome.complete,
  CognitoPartialSignOut() => SignOutOutcome.partial,
  _ => SignOutOutcome.failed,
};
