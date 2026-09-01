import 'dart:convert';
import 'dart:math' as math;

import 'package:http/http.dart' as http;
import 'package:qudrat_maghrabi_app/core/config/app_environment.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseStudentLearningRepository implements StudentLearningRepository {
  SupabaseStudentLearningRepository(this._client, {http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  final SupabaseClient _client;
  final http.Client _httpClient;

  @override
  Future<CourseLearningContent> loadCourse({
    required String courseId,
    required String studentId,
  }) async {
    final Map<String, dynamic>? course = await _client
        .from('courses')
        .select(
          'id, title, description, thumbnail_url, price, '
          'parent_course_id, is_published',
        )
        .eq('id', courseId)
        .eq('is_published', true)
        .maybeSingle();
    if (course == null) {
      throw const LearningFailure('الكورس غير موجود أو غير منشور حاليًا');
    }

    // إجمالي الدروس المنشورة بييجي من إحصائيات الكورس العامة، لأن استعلام
    // الدروس نفسه بيرجع لغير المشترك الدروس المجانية بس. بيتنفّذ بالتوازي،
    // وفشله مايمنعش تحميل الكورس.
    Future<Map<String, dynamic>?> loadPublicStats() async {
      try {
        return await _client
            .from('course_public_stats')
            .select('lessons_count')
            .eq('course_id', courseId)
            .maybeSingle();
      } catch (_) {
        return null;
      }
    }

    final statsFuture = loadPublicStats();

    // نفس شرط has_active_course_access على السيرفر: الكورس المنشور اللي سعره 0
    // ومالوش كورسات فرعية متاح للكل. لازم نعرف هل له كورسات فرعية عشان نفرّق
    // بين الكورس المجاني والباقة اللي سعرها 0 بس محتواها في كورسات مدفوعة.
    Future<bool> loadHasChildCourses() async {
      try {
        final rows = await _client
            .from('courses')
            .select('id')
            .eq('parent_course_id', courseId)
            .limit(1);
        return (rows as List).isNotEmpty;
      } catch (_) {
        // الأكثر تحفظًا: نعتبره باقة فما نفتحش محتوى بالغلط
        return true;
      }
    }

    final hasChildCoursesFuture = loadHasChildCourses();

    // مخطط الدروس العام: بيرجع كل دروس الكورس لأي طالب (عناوين ومدد وأغلفة
    // بس، من غير video_id)، عشان المنهج يبان كامل والدرس غير المتاح يظهر
    // عليه قفل بدل ما يختفي تمامًا من القائمة.
    Future<List<Map<String, dynamic>>> loadOutline() async {
      try {
        final rows = await _client
            .from('lesson_public_outline')
            .select(
              'id, course_id, chapter_id, title, thumbnail_url, '
              'duration_minutes, order_index, is_free_preview',
            )
            .eq('course_id', courseId)
            .order('order_index', ascending: true);
        return (rows as List).cast<Map<String, dynamic>>();
      } catch (_) {
        return const <Map<String, dynamic>>[];
      }
    }

    final outlineFuture = loadOutline();

    final responses = await Future.wait([
      _client
          .from('chapters')
          .select('id, title, cover_url, order_index')
          .eq('course_id', courseId)
          .order('order_index', ascending: true),
      _client
          .from('lessons')
          .select(
            'id, course_id, chapter_id, title, description, video_id, '
            'thumbnail_url, duration_minutes, order_index, is_free_preview',
          )
          .eq('course_id', courseId)
          .eq('is_published', true)
          .order('order_index', ascending: true),
      _client
          .from('lesson_progress')
          .select(
            'lesson_id, watch_percentage, completed, '
            'last_position_seconds, duration_seconds',
          )
          .eq('student_id', studentId),
      _activeEnrollmentQuery(
        studentId: studentId,
        courseId: courseId,
        parentCourseId: course['parent_course_id'] as String?,
      ),
    ]);

    final chapterRows = _rows(responses[0]);
    final lessonRows = _rows(responses[1]);
    final progressRows = _rows(responses[2]);
    final enrollmentRows = _rows(responses[3]);
    final progressByLesson = <String, LessonProgress>{
      for (final row in progressRows)
        row['lesson_id'] as String: LessonProgress(
          watchPercentage: _asInt(row['watch_percentage']).clamp(0, 100),
          completed: row['completed'] as bool? ?? false,
          positionSeconds: _asInt(row['last_position_seconds']),
          durationSeconds: _asInt(row['duration_seconds']),
        ),
    };

    // الدرس المتاح بياخد بياناته الكاملة (فيها video_id)، وغير المتاح بيفضل
    // بعنوانه ومدته بس فيتقفل في الواجهة.
    final outlineRows = await outlineFuture;
    final playableById = <String, Map<String, dynamic>>{
      for (final row in lessonRows) row['id'] as String: row,
    };
    final mergedRows = outlineRows.isEmpty
        ? lessonRows
        : outlineRows
              .map(
                (row) => <String, dynamic>{
                  ...row,
                  ...?playableById[row['id'] as String],
                },
              )
              .toList();

    final lessons = mergedRows
        .map(
          (row) => CourseLesson(
            id: row['id'] as String,
            courseId: row['course_id'] as String,
            chapterId: row['chapter_id'] as String?,
            title: (row['title'] as String?)?.trim() ?? '',
            description: (row['description'] as String?)?.trim() ?? '',
            videoId: _cleanText(row['video_id']),
            thumbnailUrl: _cleanText(row['thumbnail_url']),
            durationMinutes: row['duration_minutes'] == null
                ? null
                : _asInt(row['duration_minutes']),
            orderIndex: _asInt(row['order_index']),
            isFreePreview: row['is_free_preview'] as bool? ?? false,
            progress: progressByLesson[row['id']] ?? LessonProgress.empty,
          ),
        )
        .toList();
    final lessonsByChapter = <String, List<CourseLesson>>{};
    for (final lesson in lessons) {
      final chapterId = lesson.chapterId;
      if (chapterId == null) continue;
      lessonsByChapter.putIfAbsent(chapterId, () => []).add(lesson);
    }
    final chapters = chapterRows
        .map(
          (row) => CourseChapter(
            id: row['id'] as String,
            title: (row['title'] as String?)?.trim() ?? '',
            coverUrl: _cleanText(row['cover_url']),
            orderIndex: _asInt(row['order_index']),
            lessons: lessonsByChapter[row['id']] ?? const [],
          ),
        )
        .toList();
    final ungroupedLessons = lessons
        .where((lesson) => lesson.chapterId == null)
        .toList();
    final price = _asDouble(course['price']);
    final hasActiveEnrollment = enrollmentRows.any(_isActiveEnrollment);
    final hasChildCourses = await hasChildCoursesFuture;
    final isFreeLeafCourse = price <= 0 && !hasChildCourses;
    final statsRow = await statsFuture;

    return CourseLearningContent(
      courseId: courseId,
      title: (course['title'] as String?)?.trim() ?? '',
      description: (course['description'] as String?)?.trim() ?? '',
      thumbnailUrl: _cleanText(course['thumbnail_url']),
      price: price,
      hasAccess: isFreeLeafCourse || hasActiveEnrollment,
      chapters: chapters,
      ungroupedLessons: ungroupedLessons,
      totalLessonsCount: _asInt(statsRow?['lessons_count']),
    );
  }

  Future<List<Map<String, dynamic>>> _activeEnrollmentQuery({
    required String studentId,
    required String courseId,
    required String? parentCourseId,
  }) async {
    final courseIds = <String>{courseId, ?parentCourseId};
    final response = await _client
        .from('enrollments')
        .select('id, expires_at')
        .eq('student_id', studentId)
        .inFilter('course_id', courseIds.toList())
        .eq('payment_status', 'paid');
    return response.cast<Map<String, dynamic>>();
  }

  @override
  Future<List<LessonFile>> loadLessonFiles({required String lessonId}) async {
    try {
      final rows = await _client
          .from('lesson_files')
          .select('id, lesson_id, title, file_url, size_label, file_type, '
              'order_index')
          .eq('lesson_id', lessonId)
          .order('order_index', ascending: true);
      final files = <LessonFile>[];
      for (final row in (rows as List).cast<Map<String, dynamic>>()) {
        final url = (row['file_url'] as String?)?.trim() ?? '';
        final title = (row['title'] as String?)?.trim() ?? '';
        // صف بلا رابط صالح مايتعرضش أصلًا عشان الطالب ما يضغطش على ملف مكسور.
        if (url.isEmpty || Uri.tryParse(url)?.hasScheme != true) continue;
        files.add(
          LessonFile(
            id: row['id'] as String,
            lessonId: row['lesson_id'] as String,
            title: title.isEmpty ? 'ملف الدرس' : title,
            fileUrl: url,
            sizeLabel: (row['size_label'] as String?)?.trim(),
            fileType: (row['file_type'] as String?)?.trim(),
            orderIndex: (row['order_index'] as num?)?.toInt() ?? 0,
          ),
        );
      }
      return files;
    } catch (_) {
      throw const LearningFailure('تعذّر تحميل ملفات الدرس');
    }
  }

  @override
  Future<BunnyEmbedCredentials> requestVideo({
    required String courseId,
    required String videoId,
  }) async {
    final session = _client.auth.currentSession;
    if (session == null) {
      throw const LearningFailure('انتهت جلسة الدخول. سجّل دخولك مرة أخرى');
    }

    final response = await _httpClient.post(
      Uri.parse('${AppEnvironment.platformBaseUrl}/api/bunny-token'),
      headers: {
        'Authorization': 'Bearer ${session.accessToken}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'videoId': videoId, 'courseId': courseId}),
    );
    final body = _decodeObject(response.body);
    if (response.statusCode != 200) {
      throw LearningFailure(_videoErrorMessage(response.statusCode, body));
    }
    final libraryId = body['libraryId']?.toString();
    final token = body['token']?.toString();
    final expires = _asInt(body['expires']);
    if (libraryId == null || token == null || expires == 0) {
      throw const LearningFailure('تعذّر تجهيز الفيديو. حاول مرة أخرى');
    }
    return BunnyEmbedCredentials(
      libraryId: libraryId,
      token: token,
      expires: expires,
    );
  }

  @override
  Future<LessonProgress> saveProgress({
    required String studentId,
    required String lessonId,
    required LessonProgress current,
    required int watchPercentage,
    required bool completed,
    required int positionSeconds,
    required int durationSeconds,
  }) async {
    final nextPercentage = math.max(
      current.watchPercentage,
      watchPercentage.clamp(0, 100),
    );
    final nextCompleted = current.completed || completed;
    final safeDuration = math.max(current.durationSeconds, durationSeconds);
    final safePosition = positionSeconds.clamp(
      0,
      safeDuration > 0 ? safeDuration : positionSeconds,
    );
    final payload = <String, dynamic>{
      'student_id': studentId,
      'lesson_id': lessonId,
      'watch_percentage': nextCompleted ? 100 : nextPercentage,
      'last_position_seconds': nextCompleted && safeDuration > 0
          ? safeDuration
          : safePosition,
      'duration_seconds': safeDuration,
      'last_watched_at': DateTime.now().toUtc().toIso8601String(),
    };
    // خط دفاع تاني: مابنبعتش completed إلا لما تكون true. الدرس المكتمل
    // مابيرجعش غير مكتمل في المنصة أصلًا، وبكده أي حفظ متأخر للموضع
    // مايقدرش يمسح علامة الإكمال. العمود قيمته الافتراضية false فالصف
    // الجديد بيتسجّل صح من غير ما نبعتها.
    if (nextCompleted) payload['completed'] = true;

    final Map<String, dynamic> row = await _client
        .from('lesson_progress')
        .upsert(payload, onConflict: 'student_id,lesson_id')
        .select(
          'watch_percentage, completed, last_position_seconds, '
          'duration_seconds',
        )
        .single();

    return LessonProgress(
      watchPercentage: _asInt(row['watch_percentage']).clamp(0, 100),
      completed: row['completed'] as bool? ?? false,
      positionSeconds: _asInt(row['last_position_seconds']),
      durationSeconds: _asInt(row['duration_seconds']),
    );
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

  Map<String, dynamic> _decodeObject(String value) {
    try {
      final decoded = jsonDecode(value);
      return decoded is Map<String, dynamic> ? decoded : const {};
    } catch (_) {
      return const {};
    }
  }

  String _videoErrorMessage(int statusCode, Map<String, dynamic> body) {
    switch (statusCode) {
      case 401:
        return 'انتهت جلسة الدخول. سجّل دخولك مرة أخرى';
      case 403:
        return 'هذا الفيديو متاح للمشتركين في الكورس فقط';
      case 404:
        return 'الفيديو غير متاح حاليًا';
      default:
        return body['error'] == 'Bunny Stream not configured'
            ? 'خدمة الفيديو غير مهيأة حاليًا'
            : 'تعذّر تشغيل الفيديو. تحقق من الإنترنت وحاول مجددًا';
    }
  }

  int _asInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  double _asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String? _cleanText(dynamic value) {
    final text = value?.toString().trim();
    return text == null || text.isEmpty ? null : text;
  }
}
