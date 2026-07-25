class StudentCourse {
  const StudentCourse({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    required this.currency,
    required this.level,
    required this.lessonsCount,
    required this.enrolledCount,
    required this.childCoursesCount,
    required this.hasAccess,
    required this.progressPercent,
    required this.completedLessons,
    this.thumbnailUrl,
    this.parentCourseId,
    this.durationHours,
    this.currentLessonTitle,
  });

  final String id;
  final String title;
  final String description;
  final String? thumbnailUrl;
  final double price;
  final String currency;
  final String level;
  final String? parentCourseId;
  final double? durationHours;
  final int lessonsCount;
  final int enrolledCount;
  final int childCoursesCount;
  final bool hasAccess;
  final int progressPercent;
  final int completedLessons;
  final String? currentLessonTitle;

  bool get isFree => price <= 0 && childCoursesCount == 0;
  bool get isBundle => childCoursesCount > 0;
}
