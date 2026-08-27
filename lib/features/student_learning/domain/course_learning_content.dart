class CourseLearningContent {
  const CourseLearningContent({
    required this.courseId,
    required this.title,
    required this.description,
    required this.price,
    required this.hasAccess,
    required this.chapters,
    required this.ungroupedLessons,
    this.totalLessonsCount = 0,
    this.thumbnailUrl,
  });

  final String courseId;
  final String title;
  final String description;
  final String? thumbnailUrl;
  final double price;
  final bool hasAccess;
  final List<CourseChapter> chapters;
  final List<CourseLesson> ungroupedLessons;

  /// إجمالي دروس الكورس المنشورة من إحصائيات الكورس العامة.
  /// ضروري لأن سياسات القراءة بترجع لغير المشترك الدروس المجانية بس، فمن غيره
  /// كان الكورس المدفوع يبان "كورس مجاني" بعدد دروس ناقص وتقدّم 100%.
  final int totalLessonsCount;

  List<CourseLesson> get allLessons => [
    ...chapters.expand((chapter) => chapter.lessons),
    ...ungroupedLessons,
  ];

  int get freePreviewLessonsCount =>
      allLessons.where((lesson) => lesson.isFreePreview).length;

  /// العدد الحقيقي لدروس الكورس؛ وبنرجع لعدد الدروس الظاهرة لو الإحصائيات
  /// لسه ما وصلتش أو كانت أقل، عشان ما نعرضش عدد أقل من اللي قدامنا فعلًا.
  int get totalLessons => totalLessonsCount > allLessons.length
      ? totalLessonsCount
      : allLessons.length;

  bool get isFullyFree =>
      allLessons.isNotEmpty && freePreviewLessonsCount >= totalLessons;

  bool canAccessLesson(CourseLesson lesson) =>
      hasAccess || lesson.isFreePreview;

  int get completedLessons =>
      allLessons.where((lesson) => lesson.progress.completed).length;

  int get progressPercent {
    final total = totalLessons;
    if (total == 0) return 0;
    return ((completedLessons / total) * 100).round();
  }
}

class CourseChapter {
  const CourseChapter({
    required this.id,
    required this.title,
    required this.orderIndex,
    required this.lessons,
    this.coverUrl,
  });

  final String id;
  final String title;
  final String? coverUrl;
  final int orderIndex;
  final List<CourseLesson> lessons;

  int get completedLessons =>
      lessons.where((lesson) => lesson.progress.completed).length;

  int get progressPercent {
    if (lessons.isEmpty) return 0;
    return ((completedLessons / lessons.length) * 100).round();
  }
}

class CourseLesson {
  const CourseLesson({
    required this.id,
    required this.courseId,
    required this.title,
    required this.description,
    required this.orderIndex,
    required this.isFreePreview,
    required this.progress,
    this.chapterId,
    this.videoId,
    this.thumbnailUrl,
    this.durationMinutes,
  });

  final String id;
  final String courseId;
  final String? chapterId;
  final String title;
  final String description;
  final String? videoId;
  final String? thumbnailUrl;
  final int? durationMinutes;
  final int orderIndex;
  final bool isFreePreview;
  final LessonProgress progress;

  bool get hasVideo => videoId != null && videoId!.isNotEmpty;

  CourseLesson copyWith({LessonProgress? progress}) {
    return CourseLesson(
      id: id,
      courseId: courseId,
      chapterId: chapterId,
      title: title,
      description: description,
      videoId: videoId,
      thumbnailUrl: thumbnailUrl,
      durationMinutes: durationMinutes,
      orderIndex: orderIndex,
      isFreePreview: isFreePreview,
      progress: progress ?? this.progress,
    );
  }
}

class LessonProgress {
  const LessonProgress({
    required this.watchPercentage,
    required this.completed,
    this.positionSeconds = 0,
    this.durationSeconds = 0,
  });

  static const empty = LessonProgress(watchPercentage: 0, completed: false);

  final int watchPercentage;
  final bool completed;
  final int positionSeconds;
  final int durationSeconds;
}

class BunnyEmbedCredentials {
  const BunnyEmbedCredentials({
    required this.libraryId,
    required this.token,
    required this.expires,
  });

  final String libraryId;
  final String token;
  final int expires;
}
