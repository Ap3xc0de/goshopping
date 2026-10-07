import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/auth_redirect.dart';
import '../../../../core/strings/app_strings.dart';
import '../../domain/validators/auth_validators.dart';
import '../auth_failure_messages.dart';
import '../providers.dart';
import '../widgets/auth_widgets.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!isValidEmail(_email.text)) return;
    final email = _email.text.trim();
    final ok = await ref
        .read(forgotPasswordControllerProvider.notifier)
        .request(email);
    if (ok && mounted) {
      context.go(
        Uri(
          path: AppRoutes.reset,
          queryParameters: {'email': email},
        ).toString(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(forgotPasswordControllerProvider);
    final loading = state.isLoading;
    final failure = state.error;

    return AuthScaffold(
      title: AppStrings.forgotTitle,
      children: [
        const Text(AppStrings.forgotInstructions),
        const SizedBox(height: 16),
        if (failure != null) ...[
          ErrorBanner(message: authFailureMessage(failure)),
          const SizedBox(height: 16),
        ],
        EmailField(
          controller: _email,
          enabled: !loading,
          autofocus: true,
          textInputAction: TextInputAction.done,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 24),
        SubmitButton(
          label: AppStrings.sendCodeButton,
          loading: loading,
          onPressed: isValidEmail(_email.text) ? _submit : null,
        ),
      ],
    );
  }
}
