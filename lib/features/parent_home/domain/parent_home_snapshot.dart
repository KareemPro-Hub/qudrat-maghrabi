class ParentCourseProgress {
  const ParentCourseProgress({
    required this.id,
    required this.title,
    required this.completedLessons,
    required this.totalLessons,
    required this.studyMinutes,
    this.currentLessonTitle,
    this.lastActivityAt,
  });

  final String id;
  final String title;
  final int completedLessons;
  final int totalLessons;
  final int studyMinutes;
  final String? currentLessonTitle;
  final DateTime? lastActivityAt;

  int get progressPercent {
    if (totalLessons == 0) return 0;
    return ((completedLessons / totalLessons) * 100).round().clamp(0, 100);
  }
}

class ParentQuizSummary {
  const ParentQuizSummary({
    required this.id,
    required this.title,
    required this.score,
    required this.totalMarks,
    required this.passed,
    required this.takenAt,
  });

  final String id;
  final String title;
  final int score;
  final int totalMarks;
  final bool passed;
  final DateTime takenAt;

  int get percent {
    if (totalMarks == 0) return 0;
    return ((score / totalMarks) * 100).round().clamp(0, 100);
  }
}

class ParentStudentSummary {
  const ParentStudentSummary({
    required this.id,
    required this.fullName,
    required this.email,
    required this.courses,
    required this.quizResults,
    required this.activeDaysThisWeek,
    required this.studyMinutes,
  });

  final String id;
  final String fullName;
  final String email;
  final List<ParentCourseProgress> courses;
  final List<ParentQuizSummary> quizResults;
  final int activeDaysThisWeek;
  final int studyMinutes;

  ParentCourseProgress? get primaryCourse =>
      courses.isEmpty ? null : courses.first;

  ParentQuizSummary? get lastQuiz =>
      quizResults.isEmpty ? null : quizResults.first;

  int get overallProgress {
    final totalLessons = courses.fold<int>(
      0,
      (sum, course) => sum + course.totalLessons,
    );
    if (totalLessons == 0) return 0;
    final completedLessons = courses.fold<int>(
      0,
      (sum, course) => sum + course.completedLessons,
    );
    return ((completedLessons / totalLessons) * 100).round().clamp(0, 100);
  }

  int? get averageQuizScore {
    if (quizResults.isEmpty) return null;
    final total = quizResults.fold<int>(
      0,
      (sum, result) => sum + result.percent,
    );
    return (total / quizResults.length).round();
  }
}

class ParentHomeSnapshot {
  const ParentHomeSnapshot({required this.students});

  final List<ParentStudentSummary> students;

  static const empty = ParentHomeSnapshot(students: []);
}

class ParentLinkCode {
  const ParentLinkCode({required this.code, required this.expiresAt});

  final String code;
  final DateTime expiresAt;
}
