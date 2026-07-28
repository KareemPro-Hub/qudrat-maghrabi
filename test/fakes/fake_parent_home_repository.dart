import 'package:qudrat_maghrabi_app/features/parent_home/data/parent_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/domain/parent_home_snapshot.dart';

class FakeParentHomeRepository implements ParentHomeRepository {
  FakeParentHomeRepository({ParentHomeSnapshot? snapshot, this.linkedSnapshot})
    : snapshot = snapshot ?? ParentHomeSnapshot.empty;

  static final linkedStudent = ParentStudentSummary(
    id: 'student-id',
    fullName: 'كريم محمد',
    email: 'student@example.com',
    courses: [
      ParentCourseProgress(
        id: 'foundation-course',
        title: 'دورة تأسيس 2027',
        completedLessons: 3,
        totalLessons: 5,
        studyMinutes: 85,
        currentLessonTitle: 'النسبة والتناسب',
        lastActivityAt: DateTime(2026, 7, 27),
      ),
    ],
    quizResults: [
      ParentQuizSummary(
        id: 'result-id',
        title: 'اختبار الأعداد العشرية',
        score: 9,
        totalMarks: 10,
        passed: true,
        takenAt: DateTime(2026, 7, 27),
      ),
    ],
    activeDaysThisWeek: 3,
    studyMinutes: 85,
  );

  static final sampleSnapshot = ParentHomeSnapshot(students: [linkedStudent]);

  ParentHomeSnapshot snapshot;
  ParentHomeSnapshot? linkedSnapshot;
  Object? error;
  int loadCalls = 0;
  int linkCalls = 0;
  int createCodeCalls = 0;
  int reminderCalls = 0;
  String? lastLinkedCode;
  ParentLinkCode createdLinkCode = ParentLinkCode(
    code: 'ABCD-EF12-3456-7890',
    expiresAt: DateTime.now().add(const Duration(hours: 24)),
  );

  @override
  Future<ParentHomeSnapshot> load({required String parentId}) async {
    loadCalls += 1;
    final value = error;
    if (value != null) throw value;
    return snapshot;
  }

  @override
  Future<ParentLinkCode> createParentLinkCode() async {
    createCodeCalls += 1;
    final value = error;
    if (value != null) throw value;
    return createdLinkCode;
  }

  @override
  Future<void> linkStudentByCode({required String code}) async {
    linkCalls += 1;
    lastLinkedCode = code;
    final value = error;
    if (value != null) throw value;
    snapshot = linkedSnapshot ?? sampleSnapshot;
  }

  @override
  Future<void> sendReminder({
    required String studentId,
    required String parentName,
    String? lessonTitle,
  }) async {
    reminderCalls += 1;
    final value = error;
    if (value != null) throw value;
  }
}
