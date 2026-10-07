import 'package:flutter/foundation.dart';

import '../domain/entities/social_provider.dart';

/// Social buttons to show on each platform.
///
/// iOS shows all three: App Store guideline 4.8 requires Sign in with Apple
/// whenever other social logins are offered. Android hides Apple: it is not
/// required there, the web-based flow is clunky for users, and it needs extra
/// Apple Services ID setup. (Product decision to confirm.)
List<SocialProvider> socialProvidersFor(TargetPlatform platform) =>
    platform == TargetPlatform.iOS
    ? const [
        SocialProvider.google,
        SocialProvider.apple,
        SocialProvider.facebook,
      ]
    : const [SocialProvider.google, SocialProvider.facebook];
