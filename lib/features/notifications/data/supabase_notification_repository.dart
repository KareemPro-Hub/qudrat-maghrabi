import 'package:qudrat_maghrabi_app/features/notifications/data/notification_repository.dart';
import 'package:qudrat_maghrabi_app/features/notifications/domain/app_notification.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseNotificationRepository implements NotificationRepository {
  const SupabaseNotificationRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<List<AppNotification>> load({required String userId}) async {
    final response = await _client
        .from('notifications')
        .select('id, title, body, type, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .limit(100);
    return (response as List).map((value) {
      final row = value as Map<String, dynamic>;
      return AppNotification(
        id: row['id'] as String,
        title: (row['title'] as String?)?.trim() ?? 'إشعار',
        body: (row['body'] as String?)?.trim() ?? '',
        type: (row['type'] as String?) ?? 'info',
        isRead: row['is_read'] as bool? ?? false,
        createdAt:
            DateTime.tryParse(row['created_at']?.toString() ?? '') ??
            DateTime.now(),
      );
    }).toList();
  }

  @override
  Future<void> markAllRead({required String userId}) async {
    await _client
        .from('notifications')
        .update({'is_read': true})
        .eq('user_id', userId)
        .eq('is_read', false);
  }
}
