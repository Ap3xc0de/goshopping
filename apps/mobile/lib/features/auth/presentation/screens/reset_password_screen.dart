import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/auth_redirect.dart';
import '../../../../core/strings/app_strings.dart';
import '../../domain/validators/auth_validators.dart';
import '../auth_failure_messages.dart';
import '../providers.dart';
import '../widgets/auth_widgets.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, required this.email});

  final String email;

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _code = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _code.dispose();
    _password.dispose();
    super.dispose();
  }

  bool get _valid =>
      isValidConfirmationCode(_code.text) &&
      PasswordRules.check(_password.text).isValid;

  Future<void> _submit() async {
    if (!_valid) return;
    final ok = await ref
        .read(resetPasswordControllerProvider.notifier)
        .reset(
          email: widget.email,
          code: _code.text,
          newPassword: _password.text,
        );
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(AppStrings.passwordResetNotice)),
      );
      context.go(AppRoutes.welcome);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(resetPasswordControllerProvider);
    final loading = state.isLoading;
    final failure = state.error;

    return AuthScaffold(
      title: AppStrings.resetTitle,
      children: [
        Text(AppStrings.resetInstructions(widget.email)),
        const SizedBox(height: 16),
        if (failure != null) ...[
          ErrorBanner(message: authFailureMessage(failure)),
          const SizedBox(height: 16),
        ],
        CodeField(
          controller: _code,
          enabled: !loading,
          textInputAction: TextInputAction.next,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        PasswordField(
          controller: _password,
          label: AppStrings.newPasswordLabel,
          isNewPassword: true,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => loading ? null : _submit(),
        ),
        const SizedBox(height: 12),
        PasswordRulesChecklist(password: _password.text),
        const SizedBox(height: 24),
        SubmitButton(
          label: AppStrings.resetButton,
          loading: loading,
          onPressed: _valid ? _submit : null,
        ),
      ],
    );
  }
}
