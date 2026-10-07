import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/auth_redirect.dart';
import '../../../../core/strings/app_strings.dart';
import '../../domain/validators/auth_validators.dart';
import '../auth_failure_messages.dart';
import '../auth_keys.dart';
import '../providers.dart';
import '../widgets/auth_widgets.dart';

class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _email = TextEditingController();
  final _name = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _name.dispose();
    _password.dispose();
    super.dispose();
  }

  bool get _valid =>
      isValidEmail(_email.text) && PasswordRules.check(_password.text).isValid;

  Future<void> _submit() async {
    if (!_valid) return;
    final email = _email.text.trim();
    final ok = await ref
        .read(signUpControllerProvider.notifier)
        .signUp(email: email, password: _password.text, name: _name.text);
    if (ok && mounted) {
      context.go(
        Uri(
          path: AppRoutes.confirm,
          queryParameters: {'email': email},
        ).toString(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(signUpControllerProvider);
    final loading = state.isLoading;
    final failure = state.error;

    return AuthScaffold(
      title: AppStrings.signUpTitle,
      children: [
        if (failure != null) ...[
          ErrorBanner(message: authFailureMessage(failure)),
          const SizedBox(height: 16),
        ],
        EmailField(
          controller: _email,
          enabled: !loading,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        TextFormField(
          key: AuthKeys.name,
          controller: _name,
          enabled: !loading,
          textInputAction: TextInputAction.next,
          textCapitalization: TextCapitalization.words,
          autofillHints: const [AutofillHints.name],
          decoration: const InputDecoration(labelText: AppStrings.nameLabel),
        ),
        const SizedBox(height: 16),
        PasswordField(
          controller: _password,
          isNewPassword: true,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => loading ? null : _submit(),
        ),
        const SizedBox(height: 12),
        PasswordRulesChecklist(password: _password.text),
        const SizedBox(height: 24),
        SubmitButton(
          label: AppStrings.signUpButton,
          loading: loading,
          onPressed: _valid ? _submit : null,
        ),
      ],
    );
  }
}
