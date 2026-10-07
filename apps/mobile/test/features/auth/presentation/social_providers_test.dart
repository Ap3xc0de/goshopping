import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/features/auth/domain/entities/social_provider.dart';
import 'package:goshopping/features/auth/presentation/social_providers_for_platform.dart';

void main() {
  test('iOS offers Google, Apple and Facebook (Apple guideline 4.8)', () {
    expect(socialProvidersFor(TargetPlatform.iOS), [
      SocialProvider.google,
      SocialProvider.apple,
      SocialProvider.facebook,
    ]);
  });

  test('Android offers Google and Facebook only', () {
    expect(socialProvidersFor(TargetPlatform.android), [
      SocialProvider.google,
      SocialProvider.facebook,
    ]);
  });

  test('other platforms behave like Android', () {
    expect(
      socialProvidersFor(TargetPlatform.macOS),
      isNot(contains(SocialProvider.apple)),
    );
  });
}
