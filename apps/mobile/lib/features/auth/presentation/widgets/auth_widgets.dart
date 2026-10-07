import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/config/auth_policy.dart';
import '../../../../core/strings/app_strings.dart';
import '../../domain/validators/auth_validators.dart';
import '../auth_keys.dart';

/// Page frame shared by the auth screens: app bar, padding and scrolling.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: children,
            ),
          ),
        ),
      ),
    );
  }
}

/// One-time confirmation code input (digits only, policy length).
class CodeField extends StatelessWidget {
  const CodeField({
    super.key,
    required this.controller,
    this.onChanged,
    this.onSubmitted,
    this.textInputAction = TextInputAction.done,
    this.enabled = true,
  });

  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final TextInputAction textInputAction;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      key: AuthKeys.code,
      controller: controller,
      enabled: enabled,
      autofocus: true,
      keyboardType: TextInputType.number,
      textInputAction: textInputAction,
      autofillHints: const [AutofillHints.oneTimeCode],
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(AuthPolicy.confirmationCodeLength),
      ],
      onChanged: onChanged,
      onFieldSubmitted: onSubmitted,
      decoration: const InputDecoration(labelText: AppStrings.codeLabel),
    );
  }
}

class EmailField extends StatelessWidget {
  const EmailField({
    super.key,
    required this.controller,
    this.onChanged,
    this.validator,
    this.autofocus = false,
    this.textInputAction = TextInputAction.next,
    this.enabled = true,
    this.forceErrorText,
  });

  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final FormFieldValidator<String>? validator;
  final bool autofocus;
  final TextInputAction textInputAction;
  final bool enabled;

  /// Shows this error regardless of the form validation state.
  final String? forceErrorText;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      key: AuthKeys.email,
      forceErrorText: forceErrorText,
      controller: controller,
      enabled: enabled,
      autofocus: autofocus,
      keyboardType: TextInputType.emailAddress,
      textInputAction: textInputAction,
      autofillHints: const [AutofillHints.email],
      autocorrect: false,
      enableSuggestions: false,
      onChanged: onChanged,
      validator: validator,
      decoration: const InputDecoration(labelText: AppStrings.emailLabel),
    );
  }
}

/// Obscured password input with a visibility toggle.
class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    this.label = AppStrings.passwordLabel,
    this.onChanged,
    this.validator,
    this.onSubmitted,
    this.textInputAction = TextInputAction.done,
    this.isNewPassword = false,
  });

  final TextEditingController controller;
  final String label;
  final ValueChanged<String>? onChanged;
  final FormFieldValidator<String>? validator;
  final ValueChanged<String>? onSubmitted;
  final TextInputAction textInputAction;
  final bool isNewPassword;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _obscured = true;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      key: AuthKeys.password,
      controller: widget.controller,
      obscureText: _obscured,
      keyboardType: TextInputType.visiblePassword,
      textInputAction: widget.textInputAction,
      autofillHints: [
        widget.isNewPassword
            ? AutofillHints.newPassword
            : AutofillHints.password,
      ],
      autocorrect: false,
      enableSuggestions: false,
      onChanged: widget.onChanged,
      onFieldSubmitted: widget.onSubmitted,
      validator: widget.validator,
      decoration: InputDecoration(
        labelText: widget.label,
        suffixIcon: IconButton(
          key: AuthKeys.togglePasswordVisibility,
          tooltip: _obscured
              ? AppStrings.showPassword
              : AppStrings.hidePassword,
          icon: Icon(_obscured ? Icons.visibility : Icons.visibility_off),
          onPressed: () => setState(() => _obscured = !_obscured),
        ),
      ),
    );
  }
}

Key _ruleKey(PasswordRule rule) => switch (rule) {
  PasswordRule.minLength => AuthKeys.ruleMinLength,
  PasswordRule.uppercase => AuthKeys.ruleUppercase,
  PasswordRule.lowercase => AuthKeys.ruleLowercase,
  PasswordRule.number => AuthKeys.ruleNumber,
};

String _ruleLabel(PasswordRule rule) => switch (rule) {
  PasswordRule.minLength => AppStrings.ruleMinLength,
  PasswordRule.uppercase => AppStrings.ruleUppercase,
  PasswordRule.lowercase => AppStrings.ruleLowercase,
  PasswordRule.number => AppStrings.ruleNumber,
};

/// Live checklist of the password policy.
class PasswordRulesChecklist extends StatelessWidget {
  const PasswordRulesChecklist({super.key, required this.password});

  final String password;

  @override
  Widget build(BuildContext context) {
    final result = PasswordRules.check(password);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppStrings.passwordRulesTitle,
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 4),
        for (final rule in PasswordRule.values)
          _Rule(
            key: _ruleKey(rule),
            label: _ruleLabel(rule),
            met: result.isMet(rule),
          ),
      ],
    );
  }
}

class _Rule extends StatelessWidget {
  const _Rule({super.key, required this.label, required this.met});

  final String label;
  final bool met;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      label: '$label: ${met ? AppStrings.ruleMet : AppStrings.rulePending}',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            Icon(
              met ? Icons.check_circle : Icons.radio_button_unchecked,
              size: 18,
              color: met ? scheme.primary : scheme.outline,
            ),
            const SizedBox(width: 8),
            Text(label),
          ],
        ),
      ),
    );
  }
}

/// Inline error shown above a form; announced by screen readers.
class ErrorBanner extends StatelessWidget {
  const ErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.errorContainer,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(message, style: TextStyle(color: scheme.onErrorContainer)),
      ),
    );
  }
}

/// Primary action: disabled when [onPressed] is null, spinner while loading.
class SubmitButton extends StatelessWidget {
  const SubmitButton({
    super.key,
    required this.label,
    required this.onPressed,
    required this.loading,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      key: AuthKeys.submit,
      onPressed: loading ? null : onPressed,
      child: loading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                semanticsLabel: AppStrings.loading,
              ),
            )
          : Text(label),
    );
  }
}
