import 'package:qudrat_maghrabi_app/features/notifications/domain/app_notification.dart';

abstract interface class NotificationRepository {
  Future<List<AppNotification>> load({required String userId});

  Future<void> markAllRead({required String userId});
}

class EmptyNotificationRepository implements NotificationRepository {
  const EmptyNotificationRepository();

  @override
  Future<List<AppNotification>> load({required String userId}) async =>
      const [];

  @override
  Future<void> markAllRead({required String userId}) async {}
}
