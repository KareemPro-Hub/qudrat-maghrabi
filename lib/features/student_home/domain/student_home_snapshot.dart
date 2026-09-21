import 'package:qudrat_maghrabi_app/features/student_home/domain/student_course.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';

class StudentHomeSnapshot {
  const StudentHomeSnapshot({
    required this.bundles,
    required this.availableCourses,
    required this.myCourses,
    required this.unreadNotifications,
    this.subscription,
    this.hasPendingCheckout = false,
  });

  final List<StudentCourse> bundles;
  final List<StudentCourse> availableCourses;
  final List<StudentCourse> myCourses;
  final int unreadNotifications;
  final StudentSubscription? subscription;

  /// الطالب بدأ اشتراك وما كمّلش الدفع، ولسه مالوش وصول. بنفكّره بلطف.
  final bool hasPendingCheckout;

  /// التذكير يظهر بس لو فعلًا مفيش اشتراك شغّال.
  bool get shouldRemindPayment => hasPendingCheckout && subscription == null;

  StudentCourse? get continueCourse {
    for (final course in myCourses) {
      if (course.progressPercent > 0 && course.progressPercent < 100) {
        return course;
      }
    }
    return null;
  }

  StudentCourse? get recommendedCourse {
    for (final course in availableCourses) {
      if (course.hasFreePreview) return course;
    }
    return availableCourses.isEmpty ? null : availableCourses.first;
  }
}
