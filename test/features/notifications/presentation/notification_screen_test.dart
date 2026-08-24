import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/features/notifications/data/notification_repository.dart';
import 'package:qudrat_maghrabi_app/features/notifications/domain/app_notification.dart';
import 'package:qudrat_maghrabi_app/features/notifications/presentation/notification_screen.dart';

class _FakeNotificationRepository implements NotificationRepository {
  @override
  Future<List<AppNotification>> load({required String userId}) async => [
    AppNotification(
      id: 'notification-1',
      title: 'تم تفعيل اشتراكك بنجاح ! 🎉',
      body: 'يمكنك الآن الوصول لجميع دروس الكورس والبدء في التعلم',
      type: 'enrollment',
      isRead: true,
      createdAt: DateTime(2020, 8, 12),
    ),
  ];

  @override
  Future<void> markAllRead({required String userId}) async {}
}

void main() {
  testWidgets('enrollment notification uses accurate copy and date order', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: NotificationScreen(
          userId: 'student-1',
          repository: _FakeNotificationRepository(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text(
        'يمكنك الآن الوصول إلى المحتوى المتاح ضمن باقتك والبدء في التعلّم.',
      ),
      findsOneWidget,
    );
    expect(
      find.text('يمكنك الآن الوصول لجميع دروس الكورس والبدء في التعلم'),
      findsNothing,
    );
    expect(find.text('2020 / 08 / 12'), findsOneWidget);
  });
}
