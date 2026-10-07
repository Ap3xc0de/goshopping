import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/core/config/auth_policy.dart';
import 'package:goshopping/core/strings/app_strings.dart';
import 'package:goshopping/features/auth/domain/validators/auth_validators.dart';
import 'package:goshopping/features/auth/presentation/auth_keys.dart';
import 'package:goshopping/features/auth/presentation/widgets/auth_widgets.dart';

Widget host(Widget child) => MaterialApp(
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

void main() {
  group('CodeField', () {
    testWidgets('keeps digits only, up to the policy length', (tester) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(host(CodeField(controller: controller)));

      await tester.enterText(find.byKey(AuthKeys.code), 'a1b2c3d4e5f6g7h8');
      expect(
        controller.text,
        '12345678'.substring(0, AuthPolicy.confirmationCodeLength),
      );
      expect(find.text(AppStrings.codeLabel), findsOneWidget);
    });

    testWidgets('reports changes and submissions, and can be disabled', (
      tester,
    ) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      var changed = 0;
      String? submitted;
      await tester.pumpWidget(
        host(
          CodeField(
            controller: controller,
            onChanged: (_) => changed++,
            onSubmitted: (v) => submitted = v,
          ),
        ),
      );
      await tester.enterText(find.byKey(AuthKeys.code), '123456');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      expect(changed, 1);
      expect(submitted, '123456');

      await tester.pumpWidget(
        host(CodeField(controller: controller, enabled: false)),
      );
      expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);
    });
  });

  group('PasswordRulesChecklist', () {
    testWidgets('renders one row per rule from the shared definition', (
      tester,
    ) async {
      await tester.pumpWidget(host(const PasswordRulesChecklist(password: '')));
      for (final key in [
        AuthKeys.ruleMinLength,
        AuthKeys.ruleUppercase,
        AuthKeys.ruleLowercase,
        AuthKeys.ruleNumber,
      ]) {
        expect(find.byKey(key), findsOneWidget);
      }
      expect(
        find.byIcon(Icons.radio_button_unchecked),
        findsNWidgets(PasswordRule.values.length),
      );
    });

    testWidgets('marks met rules from the same rule results', (tester) async {
      await tester.pumpWidget(
        host(const PasswordRulesChecklist(password: 'Abcdef12')),
      );
      expect(
        find.byIcon(Icons.check_circle),
        findsNWidgets(PasswordRule.values.length),
      );
    });
  });
}
