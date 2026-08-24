import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/notifications/data/notification_repository.dart';
import 'package:qudrat_maghrabi_app/features/notifications/domain/app_notification.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({
    required this.userId,
    required this.repository,
    super.key,
  });

  final String userId;
  final NotificationRepository repository;

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  late Future<List<AppNotification>> _notificationsFuture;

  @override
  void initState() {
    super.initState();
    _notificationsFuture = _load();
  }

  Future<List<AppNotification>> _load() async {
    final notifications = await widget.repository.load(userId: widget.userId);
    await widget.repository.markAllRead(userId: widget.userId);
    return notifications;
  }

  Future<void> _refresh() async {
    setState(() => _notificationsFuture = _load());
    await _notificationsFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('الإشعارات')),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: FutureBuilder<List<AppNotification>>(
          future: _notificationsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(
                child: CircularProgressIndicator(color: QmColors.pink),
              );
            }
            if (snapshot.hasError) {
              return _MessageView(
                icon: Icons.cloud_off_rounded,
                title: 'تعذّر تحميل الإشعارات',
                action: FilledButton(
                  onPressed: _refresh,
                  child: const Text('إعادة المحاولة'),
                ),
              );
            }
            final notifications = snapshot.data ?? const [];
            if (notifications.isEmpty) {
              return const _MessageView(
                icon: Icons.notifications_none_rounded,
                title: 'لا توجد إشعارات بعد',
              );
            }
            return RefreshIndicator(
              color: QmColors.pink,
              onRefresh: _refresh,
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 36),
                itemCount: notifications.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, index) =>
                    _NotificationCard(notification: notifications[index]),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.notification});

  final AppNotification notification;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (notification.type) {
      'payment' => (Icons.workspace_premium_rounded, QmColors.pink),
      'success' => (Icons.check_circle_rounded, QmColors.success),
      'warning' => (Icons.warning_amber_rounded, const Color(0xFFB97800)),
      'enrollment' => (Icons.school_rounded, QmColors.purple),
      _ => (Icons.notifications_rounded, QmColors.deepPurple),
    };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .9),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: notification.isRead
              ? QmColors.border
              : color.withValues(alpha: .35),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notification.title,
                  style: const TextStyle(
                    color: QmColors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  _bodyLabel(notification),
                  style: const TextStyle(
                    color: QmColors.textSecondary,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _dateLabel(notification.createdAt),
                  textDirection: TextDirection.ltr,
                  style: TextStyle(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          if (!notification.isRead)
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
        ],
      ),
    );
  }

  String _dateLabel(DateTime date) {
    final local = date.toLocal();
    final now = DateTime.now();
    final difference = now.difference(local);
    if (difference.inMinutes < 1) return 'الآن';
    if (difference.inHours < 1) return 'منذ ${difference.inMinutes} دقيقة';
    if (difference.inDays < 1) return 'منذ ${difference.inHours} ساعة';
    if (difference.inDays == 1) return 'أمس';
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    return '$day / $month / ${local.year}';
  }

  String _bodyLabel(AppNotification notification) {
    if (notification.type == 'enrollment' &&
        notification.body ==
            'يمكنك الآن الوصول لجميع دروس الكورس والبدء في التعلم') {
      return 'يمكنك الآن الوصول إلى المحتوى المتاح ضمن باقتك والبدء في التعلّم.';
    }
    return notification.body;
  }
}

class _MessageView extends StatelessWidget {
  const _MessageView({required this.icon, required this.title, this.action});

  final IconData icon;
  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 70, color: QmColors.textMuted),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: QmColors.textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),
            if (action != null) ...[const SizedBox(height: 18), action!],
          ],
        ),
      ),
    );
  }
}
