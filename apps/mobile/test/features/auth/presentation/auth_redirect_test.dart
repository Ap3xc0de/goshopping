import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/router/auth_redirect.dart';

import '../../../support/fakes.dart';

String? redirect(
  String location, {
  bool configured = true,
  bool restoring = false,
  bool restoreFailed = false,
  bool signedIn = false,
}) => authRedirect(
  isConfigured: configured,
  isRestoring: restoring,
  restoreFailed: restoreFailed,
  user: signedIn ? testUser : null,
  location: location,
);

void main() {
  group('not configured', () {
    test('everything goes to /not-configured', () {
      expect(redirect('/welcome', configured: false), '/not-configured');
      expect(
        redirect('/home', configured: false, signedIn: true),
        '/not-configured',
      );
    });
    test('already there: no redirect', () {
      expect(redirect('/not-configured', configured: false), isNull);
    });
  });

  group('restoring the session', () {
    test('shows the splash', () {
      expect(redirect('/welcome', restoring: true), '/splash');
      expect(redirect('/home', restoring: true), '/splash');
      expect(redirect('/splash', restoring: true), isNull);
    });
  });

  group('session restore failed', () {
    test('every route goes to the retry screen', () {
      for (final p in [
        '/welcome',
        '/home',
        '/splash',
        '/sign-up',
        '/unknown',
      ]) {
        expect(redirect(p, restoreFailed: true), '/session-error', reason: p);
      }
    });
    test('already on the retry screen: no redirect', () {
      expect(redirect('/session-error', restoreFailed: true), isNull);
    });
    test('a retry in flight shows the splash, not the error', () {
      expect(
        redirect('/session-error', restoring: true, restoreFailed: true),
        '/splash',
      );
    });
    test('not configured still wins', () {
      expect(
        redirect('/welcome', configured: false, restoreFailed: true),
        '/not-configured',
      );
    });
    test('the retry screen is not reachable once the session is known', () {
      expect(redirect('/session-error'), '/welcome');
      expect(redirect('/session-error', signedIn: true), '/home');
    });
  });

  group('signed out', () {
    test('public routes are allowed', () {
      for (final p in [
        '/welcome',
        '/sign-up',
        '/confirm',
        '/forgot',
        '/reset',
      ]) {
        expect(redirect(p), isNull, reason: p);
      }
    });
    test('protected and transient routes go to /welcome', () {
      expect(redirect('/home'), '/welcome');
      expect(redirect('/splash'), '/welcome');
      expect(redirect('/not-configured'), '/welcome');
      expect(redirect('/unknown'), '/welcome');
    });
  });

  group('signed in', () {
    test(
      '/home is allowed',
      () => expect(redirect('/home', signedIn: true), isNull),
    );
    test('auth screens, splash and unknown routes go to /home', () {
      for (final p in [
        '/welcome',
        '/sign-up',
        '/confirm',
        '/forgot',
        '/reset',
        '/splash',
        '/not-configured',
        '/unknown',
      ]) {
        expect(redirect(p, signedIn: true), '/home', reason: p);
      }
    });
  });
}
