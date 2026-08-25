import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/main.dart';

void main() {
  testWidgets('startup failure shows a useful message instead of a blank screen', (
    tester,
  ) async {
    await tester.pumpWidget(const AppStartupFailure());

    expect(find.textContaining('تعذّر تشغيل التطبيق'), findsOneWidget);
    expect(find.textContaining('تحقق من اتصال الإنترنت'), findsOneWidget);
  });
}
