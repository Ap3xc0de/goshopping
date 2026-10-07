import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/auth_redirect.dart';
import '../../../../core/strings/app_strings.dart';
import '../../domain/validators/auth_validators.dart';
import '../auth_failure_messages.dart';
import '../providers.dart';
import '../widgets/auth_widgets.dart';

class ConfirmCodeScreen extends ConsumerStatefulWidget {
  const ConfirmCodeScreen({super.key, required this.email});

  final String email;

  @override
  ConsumerState<ConfirmCodeScreen> createState() => _ConfirmCodeScreenState();
}

class _ConfirmCodeScreenState extends ConsumerState<ConfirmCodeScreen> {
  final _code = TextEditingController();

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    if (!isValidConfirmationCode(_code.text)) return;
    final ok = await ref
        .read(confirmCodeControllerProvider.notifier)
        .confirm(email: widget.email, code: _code.text);
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(AppStrings.accountConfirmedNotice)),
      );
      context.go(AppRoutes.welcome);
    }
  }

  Future<void> _resend() async {
    final ok = await ref
        .read(confirmCodeControllerProvider.notifier)
        .resend(widget.email);
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(AppStrings.codeResentNotice)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(confirmCodeControllerProvider);
    final loading = state.isLoading;
    final failure = state.error;

    return AuthScaffold(
      title: AppStrings.confirmTitle,
      children: [
        Text(AppStrings.confirmInstructions(widget.email)),
        const SizedBox(height: 16),
        if (failure != null) ...[
          ErrorBanner(message: authFailureMessage(failure)),
          const SizedBox(height: 16),
        ],
        CodeField(
          controller: _code,
          enabled: !loading,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => loading ? null : _confirm(),
        ),
        const SizedBox(height: 24),
        SubmitButton(
          label: AppStrings.confirmButton,
          loading: loading,
          onPressed: isValidConfirmationCode(_code.text) ? _confirm : null,
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: loading ? null : _resend,
          child: const Text(AppStrings.resendCode),
        ),
      ],
    );
  }
}
