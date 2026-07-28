import 'package:qudrat_maghrabi_app/features/parent_home/data/parent_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/domain/parent_home_snapshot.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseParentHomeRepository implements ParentHomeRepository {
  const SupabaseParentHomeRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<ParentHomeSnapshot> load({required String parentId}) async {
    try {
      final linksResponse = await _client
          .from('parent_student')
          .select(
            'student_id, '
            'student_profile:profiles!parent_student_student_id_fkey'
            '(id, full_name, email)',
          )
          .eq('parent_id', parentId)
          .order('created_at', ascending: true);
      final links = _rows(linksResponse);
      if (links.isEmpty) return ParentHomeSnapshot.empty;

      final studentIds = links
          .map((row) => row['student_id'] as String)
          .toList(growable: false);

      final responses = await Future.wait([
        _client
            .from('enrollments')
            .select(
              'student_id, course_id, payment_status, expires_at, enrolled_at, '
              'courses(id, title)',
            )
            .inFilter('student_id', studentIds)
            .eq('payment_status', 'paid')
            .order('enrolled_at', ascending: false),
        _client
            .from('lesson_progress')
            .select(
              'student_id, lesson_id, completed, watch_percentage, '
              'last_watched_at',
            )
            .inFilter('student_id', studentIds),
        _client
            .from('quiz_results')
            .select(
              'id, student_id, score, total_marks, passed, taken_at, '
              'quizzes(title)',
            )
            .inFilter('student_id', studentIds)
            .order('taken_at', ascending: false),
      ]);

      final enrollmentRows = _rows(
        responses[0],
      ).where(_isActiveEnrollment).toList(growable: false);
      final progressRows = _rows(responses[1]);
      final quizRows = _rows(responses[2]);
      final courseIds = enrollmentRows
          .map((row) => row['course_id'] as String)
          .toSet()
          .toList(growable: false);
      final lessonRows = courseIds.isEmpty
          ? <Map<String, dynamic>>[]
          : _rows(
              await _client
                  .from('lessons')
                  .select('id, course_id, title, duration_minutes, order_index')
                  .inFilter('course_id', courseIds)
                  .eq('is_published', true)
                  .order('order_index', ascending: true),
            );

      final students = links
          .map((link) {
            final profile = (link['student_profile'] as Map)
                .cast<String, dynamic>();
            final studentId = link['student_id'] as String;
            final studentEnrollments = enrollmentRows
                .where((row) => row['student_id'] == studentId)
                .toList(growable: false);
            final studentProgress = progressRows
                .where((row) => row['student_id'] == studentId)
                .toList(growable: false);
            final progressByLesson = <String, Map<String, dynamic>>{
              for (final row in studentProgress)
                row['lesson_id'] as String: row,
            };

            final courses = studentEnrollments.map((enrollment) {
              final courseId = enrollment['course_id'] as String;
              final course = (enrollment['courses'] as Map?)
                  ?.cast<String, dynamic>();
              final lessons = lessonRows
                  .where((row) => row['course_id'] == courseId)
                  .toList(growable: false);
              final completedLessons = lessons.where((lesson) {
                return progressByLesson[lesson['id']]?['completed'] as bool? ??
                    false;
              }).length;
              final currentLesson = lessons
                  .cast<Map<String, dynamic>?>()
                  .firstWhere((lesson) {
                    if (lesson == null) return false;
                    return !(progressByLesson[lesson['id']]?['completed']
                            as bool? ??
                        false);
                  }, orElse: () => lessons.isEmpty ? null : lessons.first);
              var studyMinutes = 0.0;
              DateTime? lastActivityAt;
              for (final lesson in lessons) {
                final progress = progressByLesson[lesson['id']];
                if (progress == null) continue;
                final duration = _asInt(lesson['duration_minutes']);
                final watchPercentage = _asInt(
                  progress['watch_percentage'],
                ).clamp(0, 100);
                studyMinutes += duration * (watchPercentage / 100);
                final watchedAt = DateTime.tryParse(
                  progress['last_watched_at']?.toString() ?? '',
                );
                if (watchedAt != null &&
                    (lastActivityAt == null ||
                        watchedAt.isAfter(lastActivityAt))) {
                  lastActivityAt = watchedAt;
                }
              }

              return ParentCourseProgress(
                id: courseId,
                title: (course?['title'] as String?)?.trim() ?? 'كورس',
                completedLessons: completedLessons,
                totalLessons: lessons.length,
                studyMinutes: studyMinutes.round(),
                currentLessonTitle: (currentLesson?['title'] as String?)
                    ?.trim(),
                lastActivityAt: lastActivityAt,
              );
            }).toList();
            courses.sort((a, b) {
              final aTime = a.lastActivityAt?.millisecondsSinceEpoch ?? 0;
              final bTime = b.lastActivityAt?.millisecondsSinceEpoch ?? 0;
              return bTime.compareTo(aTime);
            });

            final results =
                quizRows.where((row) => row['student_id'] == studentId).map((
                  row,
                ) {
                  final quiz = (row['quizzes'] as Map?)
                      ?.cast<String, dynamic>();
                  return ParentQuizSummary(
                    id: row['id'] as String,
                    title: (quiz?['title'] as String?)?.trim() ?? 'اختبار',
                    score: _asInt(row['score']),
                    totalMarks: _asInt(row['total_marks']),
                    passed: row['passed'] as bool? ?? false,
                    takenAt:
                        DateTime.tryParse(row['taken_at']?.toString() ?? '') ??
                        DateTime.fromMillisecondsSinceEpoch(0),
                  );
                }).toList()..sort((a, b) => b.takenAt.compareTo(a.takenAt));

            final activityDays = <String>{};
            final weekStart = _startOfWeekSaturday(DateTime.now());
            final weekEnd = weekStart.add(const Duration(days: 7));
            for (final progress in studentProgress) {
              final date = DateTime.tryParse(
                progress['last_watched_at']?.toString() ?? '',
              )?.toLocal();
              if (date != null &&
                  !date.isBefore(weekStart) &&
                  date.isBefore(weekEnd)) {
                activityDays.add(_dayKey(date));
              }
            }
            for (final result in results) {
              final date = result.takenAt.toLocal();
              if (!date.isBefore(weekStart) && date.isBefore(weekEnd)) {
                activityDays.add(_dayKey(date));
              }
            }

            return ParentStudentSummary(
              id: studentId,
              fullName: (profile['full_name'] as String?)?.trim() ?? 'طالب',
              email: (profile['email'] as String?)?.trim() ?? '',
              courses: courses,
              quizResults: results,
              activeDaysThisWeek: activityDays.length,
              studyMinutes: courses.fold<int>(
                0,
                (sum, course) => sum + course.studyMinutes,
              ),
            );
          })
          .toList(growable: false);

      return ParentHomeSnapshot(students: students);
    } on ParentHomeFailure {
      rethrow;
    } on PostgrestException {
      throw const ParentHomeFailure(
        'تعذّر تحميل بيانات الأبناء. اسحب للتحديث وحاول مرة أخرى',
      );
    } catch (_) {
      throw const ParentHomeFailure(
        'تعذّر الاتصال بالمنصة. تحقق من الإنترنت وحاول مجددًا',
      );
    }
  }

  @override
  Future<ParentLinkCode> createParentLinkCode() async {
    try {
      final response = await _client.rpc('create_parent_link_code');
      final row = _firstRow(response);
      final expiresAt = DateTime.tryParse(row['expires_at']?.toString() ?? '');
      final code = row['code']?.toString().trim() ?? '';
      if (code.isEmpty || expiresAt == null) {
        throw const ParentHomeFailure('تعذّر إنشاء رمز الربط. حاول مرة أخرى');
      }
      return ParentLinkCode(code: code, expiresAt: expiresAt);
    } on PostgrestException catch (error) {
      final message = error.message.toLowerCase();
      if (message.contains('student_only')) {
        throw const ParentHomeFailure(
          'إنشاء رمز الربط متاح لحسابات الطلاب فقط',
        );
      }
      throw const ParentHomeFailure(
        'تعذّر إنشاء رمز الربط الآن. حاول مرة أخرى',
      );
    } on ParentHomeFailure {
      rethrow;
    } catch (_) {
      throw const ParentHomeFailure(
        'تعذّر الاتصال بالمنصة. تحقق من الإنترنت وحاول مجددًا',
      );
    }
  }

  @override
  Future<String> linkStudentByCode({required String code}) async {
    final normalizedCode = code.trim().toUpperCase();
    try {
      final response = await _client.rpc(
        'link_student_by_code',
        params: {'link_code': normalizedCode},
      );
      final row = _firstRow(response);
      final studentId = row['student_id']?.toString().trim() ?? '';
      if (studentId.isEmpty) {
        throw const ParentHomeFailure(
          'تم الربط لكن تعذّر فتح بيانات الطالب. اسحب للتحديث',
        );
      }
      return studentId;
    } on PostgrestException catch (error) {
      final message = error.message.toLowerCase();
      if (message.contains('link_code_invalid_or_expired')) {
        throw const ParentHomeFailure(
          'الرمز غير صحيح أو انتهت صلاحيته. اطلب من الطالب رمزًا جديدًا',
        );
      }
      if (message.contains('parent_only')) {
        throw const ParentHomeFailure(
          'هذه الخاصية متاحة لحسابات أولياء الأمور فقط',
        );
      }
      if (message.contains('student_unavailable')) {
        throw const ParentHomeFailure(
          'حساب الطالب غير نشط حاليًا. تواصل مع الدعم',
        );
      }
      throw const ParentHomeFailure('تعذّر ربط الطالب الآن. حاول مرة أخرى');
    } on ParentHomeFailure {
      rethrow;
    } catch (_) {
      throw const ParentHomeFailure(
        'تعذّر الاتصال بالمنصة. تحقق من الإنترنت وحاول مجددًا',
      );
    }
  }

  @override
  Future<void> sendReminder({
    required String studentId,
    required String parentName,
    String? lessonTitle,
  }) async {
    final trimmedParentName = parentName.trim();
    final reminderBody = lessonTitle == null || lessonTitle.trim().isEmpty
        ? 'أكمل خطتك الدراسية لهذا اليوم'
        : 'أكمل درسك القادم: ${lessonTitle.trim()}';
    try {
      await _client.from('notifications').insert({
        'user_id': studentId,
        'title':
            'تذكير من ${trimmedParentName.isEmpty ? 'ولي الأمر' : trimmedParentName}',
        'body': reminderBody,
        'type': 'info',
      });
    } on PostgrestException {
      throw const ParentHomeFailure('تعذّر إرسال التذكير. حاول مرة أخرى');
    } catch (_) {
      throw const ParentHomeFailure(
        'تعذّر الاتصال بالمنصة. تحقق من الإنترنت وحاول مجددًا',
      );
    }
  }

  List<Map<String, dynamic>> _rows(dynamic value) {
    return (value as List).cast<Map<String, dynamic>>();
  }

  Map<String, dynamic> _firstRow(dynamic value) {
    if (value is List && value.isNotEmpty) {
      return (value.first as Map).cast<String, dynamic>();
    }
    if (value is Map) return value.cast<String, dynamic>();
    return const <String, dynamic>{};
  }

  bool _isActiveEnrollment(Map<String, dynamic> row) {
    final expiresAt = row['expires_at'] as String?;
    if (expiresAt == null) return true;
    final expiry = DateTime.tryParse(expiresAt);
    return expiry == null || expiry.isAfter(DateTime.now());
  }

  DateTime _startOfWeekSaturday(DateTime value) {
    final local = value.toLocal();
    final daysSinceSaturday = (local.weekday + 1) % 7;
    return DateTime(
      local.year,
      local.month,
      local.day,
    ).subtract(Duration(days: daysSinceSaturday));
  }

  String _dayKey(DateTime value) => '${value.year}-${value.month}-${value.day}';

  int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
