import 'package:qudrat_maghrabi_app/features/student_home/data/student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_course.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_home_snapshot.dart';

class FakeStudentHomeRepository implements StudentHomeRepository {
  FakeStudentHomeRepository({StudentHomeSnapshot? snapshot})
    : snapshot = snapshot ?? sampleSnapshot;

  static const freeCourse = StudentCourse(
    id: 'foundation-course',
    title: 'دورة تأسيس 2027',
    description: '',
    price: 0,
    currency: 'EGP',
    level: 'beginner',
    lessonsCount: 5,
    enrolledCount: 0,
    childCoursesCount: 0,
    hasAccess: true,
    progressPercent: 0,
    completedLessons: 0,
  );

  static const paidCourse = StudentCourse(
    id: 'question-bank-course',
    title: 'بنوك الأسئلة والاختبارات',
    description: '',
    price: 249,
    currency: 'EGP',
    level: 'beginner',
    lessonsCount: 0,
    enrolledCount: 0,
    childCoursesCount: 0,
    hasAccess: false,
    progressPercent: 0,
    completedLessons: 0,
  );

  static const bundle = StudentCourse(
    id: 'bundle',
    title: 'دورة القدرات 2027',
    description: '',
    price: 0,
    currency: 'EGP',
    level: 'beginner',
    lessonsCount: 0,
    enrolledCount: 0,
    childCoursesCount: 2,
    hasAccess: false,
    progressPercent: 0,
    completedLessons: 0,
  );

  static const sampleSnapshot = StudentHomeSnapshot(
    bundles: [bundle],
    availableCourses: [freeCourse, paidCourse],
    myCourses: [freeCourse],
    unreadNotifications: 0,
  );

  StudentHomeSnapshot snapshot;
  Object? error;
  int loadCalls = 0;

  @override
  Future<StudentHomeSnapshot> load({required String studentId}) async {
    loadCalls += 1;
    final value = error;
    if (value != null) throw value;
    return snapshot;
  }
}
