import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/auth_redirect.dart';
import '../../../../core/strings/app_strings.dart';
import '../../domain/entities/social_provider.dart';
import '../../domain/failures/auth_failure.dart';
import '../../domain/validators/auth_validators.dart';
import '../auth_failure_messages.dart';
import '../providers.dart';
import '../widgets/auth_widgets.dart';

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _confirmEmailError;
  bool _fromSocial = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    _fromSocial = false;
    await ref
        .read(signInControllerProvider.notifier)
        .signIn(email: _email.text, password: _password.text);
  }

  Future<void> _social(SocialProvider provider) async {
    _fromSocial = true;
    await ref
        .read(signInControllerProvider.notifier)
        .signInWithSocial(provider);
  }

  void _confirmAccount() {
    final email = _email.text.trim();
    if (!isValidEmail(email)) {
      setState(() => _confirmEmailError = AppStrings.emailInvalid);
      return;
    }
    context.push(
      Uri(
        path: AppRoutes.confirm,
        queryParameters: {'email': email},
      ).toString(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(signInControllerProvider);
    final loading = state.isLoading;
    final failure = state.error;
    final providers = ref.watch(socialProvidersProvider);

    return AuthScaffold(
      title: AppStrings.signInTitle,
      children: [
        Text(
          AppStrings.appName,
          style: Theme.of(context).textTheme.headlineMedium,
          textAlign: TextAlign.center,
        ),
        Text(
          AppStrings.tagline,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 24),
        if (failure != null) ...[
          ErrorBanner(
            message: failure is UserNotConfirmedFailure && _fromSocial
                ? AppStrings.errorSocialNotConfirmed
                : authFailureMessage(failure),
          ),
          // A social account is confirmed by its provider: only password
          // sign-ins can be completed with a confirmation code.
          if (failure is UserNotConfirmedFailure && !_fromSocial)
            TextButton(
              onPressed: _confirmAccount,
              child: const Text(AppStrings.confirmAccountAction),
            ),
          const SizedBox(height: 16),
        ],
        Form(
          key: _formKey,
          child: Column(
            children: [
              EmailField(
                controller: _email,
                enabled: !loading,
                forceErrorText: _confirmEmailError,
                onChanged: (_) {
                  if (_confirmEmailError != null) {
                    setState(() => _confirmEmailError = null);
                  }
                },
                validator: (v) =>
                    isValidEmail(v ?? '') ? null : AppStrings.emailInvalid,
              ),
              const SizedBox(height: 16),
              PasswordField(
                controller: _password,
                validator: (v) => (v == null || v.isEmpty)
                    ? AppStrings.passwordRequired
                    : null,
                onSubmitted: (_) => loading ? null : _submit(),
              ),
            ],
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => context.push(AppRoutes.forgot),
            child: const Text(AppStrings.forgotPasswordLink),
          ),
        ),
        const SizedBox(height: 8),
        SubmitButton(
          label: AppStrings.signInButton,
          loading: loading,
          onPressed: _submit,
        ),
        const SizedBox(height: 24),
        const Row(
          children: [
            Expanded(child: Divider()),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text(AppStrings.orDivider),
            ),
            Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 24),
        for (final provider in providers) ...[
          _SocialButton(
            provider: provider,
            onPressed: loading ? null : () => _social(provider),
          ),
          const SizedBox(height: 12),
        ],
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => context.push(AppRoutes.signUp),
          child: const Text(AppStrings.createAccountLink),
        ),
      ],
    );
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({required this.provider, required this.onPressed});

  final SocialProvider provider;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final (label, icon) = switch (provider) {
      SocialProvider.google => (
        AppStrings.continueWithGoogle,
        Icons.g_mobiledata,
      ),
      SocialProvider.apple => (AppStrings.continueWithApple, Icons.apple),
      SocialProvider.facebook => (
        AppStrings.continueWithFacebook,
        Icons.facebook,
      ),
    };
    return OutlinedButton.icon(
      key: Key('social-${provider.name}'),
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
    );
  }
}
