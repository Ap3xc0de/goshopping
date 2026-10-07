import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goshopping/app.dart';
import 'package:goshopping/core/strings/app_strings.dart';

void main() {
  testWidgets('without configuration the app shows the not-configured screen', (
    tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: GoshoppingApp()));
    await tester.pumpAndSettle();

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.text(AppStrings.notConfiguredTitle), findsOneWidget);
  });
}
