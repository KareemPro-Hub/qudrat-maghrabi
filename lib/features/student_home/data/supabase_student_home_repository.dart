import 'package:qudrat_maghrabi_app/features/student_home/data/student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_course.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_home_snapshot.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/store_subscription_parser.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseStudentHomeRepository implements StudentHomeRepository {
  SupabaseStudentHomeRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<StudentHomeSnapshot> load({required String studentId}) async {
    final responses = await Future.wait([
      _client
          .from('courses')
          .select(
            'id, title, description, thumbnail_url, price, currency, '
            'level, duration_hours, order_index, parent_course_id',
          )
          .eq('is_published', true)
          .order('order_index', ascending: true)
          .order('created_at', ascending: true),
      _client
          .from('course_public_stats')
          .select('course_id, lessons_count, enrolled_count'),
      _client
          .from('enrollments')
          .select('course_id, payment_status, expires_at, enrolled_at')
          .eq('student_id', studentId)
          .eq('payment_status', 'paid'),
      _client
          .from('lesson_progress')
          .select('lesson_id, completed, watch_percentage, last_watched_at')
          .eq('student_id', studentId),
      _client
          .from('notifications')
          .select('id')
          .eq('user_id', studentId)
          .eq('is_read', false),
      _client
          .from('lessons')
          .select(
            'id, course_id, title, order_index, is_published, '
            'is_free_preview',
          )
          .eq('is_published', true)
          .order('order_index', ascending: true),
      _client
          .from('store_subscriptions')
          .select(
            'product_id, status, purchased_at, current_period_start, '
            'current_period_end, store_subscription_plans!inner('
            'name_ar, bundle_course_id)',
          )
          .eq('student_id', studentId),
    ]);

    final courseRows = _rows(responses[0]);
    final statsRows = _rows(responses[1]);
    final enrollmentRows = _rows(responses[2]);
    final progressRows = _rows(responses[3]);
    final notificationRows = _rows(responses[4]);
    final lessonRows = _rows(responses[5]);
    final storeSubscriptionRows = _rows(responses[6]);

    final statsByCourse = <String, Map<String, dynamic>>{
      for (final row in statsRows) row['course_id'] as String: row,
    };
    final activeEnrollmentRows = enrollmentRows
        .where(_isActiveEnrollment)
        .toList();
    final activeCourseIds = activeEnrollmentRows
        .map((row) => row['course_id'] as String)
        .toSet();
    final progressByLesson = <String, Map<String, dynamic>>{
      for (final row in progressRows) row['lesson_id'] as String: row,
    };
    final childCountByParent = <String, int>{};
    final freePreviewCountByCourse = <String, int>{};
    for (final lesson in lessonRows) {
      if (lesson['is_free_preview'] as bool? ?? false) {
        final courseId = lesson['course_id'] as String;
        freePreviewCountByCourse.update(
          courseId,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
      }
    }
    for (final row in courseRows) {
      final parentId = row['parent_course_id'] as String?;
      if (parentId != null) {
        childCountByParent.update(
          parentId,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
      }
    }

    final bundleIds = childCountByParent.keys.toSet();
    final activeBundleEnrollmentRows =
        activeEnrollmentRows
            .where((row) => bundleIds.contains(row['course_id']))
            .toList()
          ..sort(_compareEnrollmentExpiry);
    final activeBundleIds = activeBundleEnrollmentRows
        .map((row) => row['course_id'] as String)
        .toSet();
    final bundleCourseNames = <String, String>{
      for (final row in courseRows)
        if (bundleIds.contains(row['id']))
          row['id'] as String:
              (row['title'] as String?)?.trim() ?? 'باقة المنصة',
    };
    // اشتراك المتجر (Apple/Google) له الأولوية، وإلا نعتمد على اشتراك
    // مدفوع عبر المنصة (الموقع/Paymob) عشان الطالب ما يفضلش شايف إنه
    // غير مشترك رغم دفعه فعليًا.
    final activeSubscription =
        activeStoreSubscriptionFromRows(storeSubscriptionRows) ??
        activeEnrollmentSubscriptionFromRows(
          activeBundleEnrollmentRows,
          bundleCourseNames: bundleCourseNames,
        );

    final courses = courseRows.map((row) {
      final id = row['id'] as String;
      final stats = statsByCourse[id];
      final lessonsCount = _asInt(stats?['lessons_count']);
      final childCoursesCount = childCountByParent[id] ?? 0;
      final price = _asDouble(row['price']);
      final parentCourseId = row['parent_course_id'] as String?;
      final hasAccess =
          activeCourseIds.contains(id) ||
          (parentCourseId != null && activeBundleIds.contains(parentCourseId));
      final accessibleLessons = lessonRows
          .where((lesson) => lesson['course_id'] == id)
          .toList();
      final completedLessons = accessibleLessons
          .where(
            (lesson) =>
                progressByLesson[lesson['id']]?['completed'] as bool? ?? false,
          )
          .length;
      final progressPercent = lessonsCount == 0
          ? 0
          : ((completedLessons / lessonsCount) * 100).round().clamp(0, 100);
      Map<String, dynamic>? currentLesson;
      for (final lesson in accessibleLessons) {
        final completed =
            progressByLesson[lesson['id']]?['completed'] as bool? ?? false;
        if (!completed) {
          currentLesson = lesson;
          break;
        }
      }
      currentLesson ??= accessibleLessons.isEmpty
          ? null
          : accessibleLessons.first;

      return StudentCourse(
        id: id,
        title: (row['title'] as String?)?.trim() ?? '',
        description: (row['description'] as String?)?.trim() ?? '',
        thumbnailUrl: _cleanNullableText(row['thumbnail_url']),
        price: price,
        currency: (row['currency'] as String?) ?? 'EGP',
        level: (row['level'] as String?) ?? 'beginner',
        parentCourseId: parentCourseId,
        durationHours: row['duration_hours'] == null
            ? null
            : _asDouble(row['duration_hours']),
        lessonsCount: lessonsCount,
        enrolledCount: _asInt(stats?['enrolled_count']),
        childCoursesCount: childCoursesCount,
        freePreviewLessonsCount: freePreviewCountByCourse[id] ?? 0,
        hasAccess: hasAccess,
        progressPercent: progressPercent,
        completedLessons: completedLessons,
        currentLessonTitle: currentLesson?['title'] as String?,
      );
    }).toList();

    final bundles = courses
        .where((course) => course.parentCourseId == null)
        .toList();
    final availableCourses = courses
        .where((course) => course.parentCourseId != null)
        .toList();
    final myCourses =
        availableCourses.where((course) => course.hasAccess).toList()
          ..sort((a, b) {
            final progressComparison = b.progressPercent.compareTo(
              a.progressPercent,
            );
            if (progressComparison != 0) return progressComparison;
            return a.title.compareTo(b.title);
          });

    return StudentHomeSnapshot(
      bundles: bundles,
      availableCourses: availableCourses,
      myCourses: myCourses,
      unreadNotifications: notificationRows.length,
      subscription: activeSubscription,
    );
  }

  int _compareEnrollmentExpiry(
    Map<String, dynamic> first,
    Map<String, dynamic> second,
  ) {
    final firstExpiry = DateTime.tryParse(
      first['expires_at']?.toString() ?? '',
    );
    final secondExpiry = DateTime.tryParse(
      second['expires_at']?.toString() ?? '',
    );
    if (firstExpiry == null && secondExpiry == null) return 0;
    if (firstExpiry == null) return -1;
    if (secondExpiry == null) return 1;
    return secondExpiry.compareTo(firstExpiry);
  }

  List<Map<String, dynamic>> _rows(dynamic value) {
    return (value as List).cast<Map<String, dynamic>>();
  }

  bool _isActiveEnrollment(Map<String, dynamic> row) {
    final expiresAt = row['expires_at'] as String?;
    if (expiresAt == null) return true;
    final expiry = DateTime.tryParse(expiresAt);
    return expiry == null || expiry.isAfter(DateTime.now());
  }

  int _asInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  double _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String? _cleanNullableText(dynamic value) {
    final text = value?.toString().trim();
    return text == null || text.isEmpty ? null : text;
  }
}
