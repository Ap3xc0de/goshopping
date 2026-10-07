/// Numbers shared by validation, input formatting and user-facing copy so they
/// cannot drift apart. The password policy mirrors the Cognito user pool
/// (`infra/modules/cognito`); the code length is Cognito's fixed 6 digits.
abstract final class AuthPolicy {
  static const passwordMinLength = 8;
  static const confirmationCodeLength = 6;
}
