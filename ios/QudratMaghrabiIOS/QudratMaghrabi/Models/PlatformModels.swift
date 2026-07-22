import Foundation

enum UserRole: String, Codable, Sendable {
    case student
    case parent
    case teacher
    case contentManager = "content_manager"
    case studentManager = "student_manager"
    case quizManager = "quiz_manager"
    case admin

    var isStaff: Bool {
        switch self {
        case .teacher, .contentManager, .studentManager, .quizManager, .admin: true
        default: false
        }
    }

    var arabicTitle: String {
        switch self {
        case .student: "طالب"
        case .parent: "ولي أمر"
        case .teacher: "مدرس"
        case .contentManager: "مسؤول محتوى"
        case .studentManager: "مسؤول طلاب"
        case .quizManager: "مشرف الاختبارات"
        case .admin: "مدير المنصة"
        }
    }
}

struct Profile: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    var fullName: String
    var email: String
    var phone: String?
    var role: UserRole
    var avatarURL: String?
    var isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case email, phone, role
        case avatarURL = "avatar_url"
        case isActive = "is_active"
    }

    var firstName: String {
        fullName.split(separator: " ").first.map(String.init) ?? fullName
    }

    var initial: String {
        String(firstName.first ?? "ط")
    }
}

struct Course: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let title: String
    let description: String?
    let thumbnailURL: String?
    let price: Double
    let currency: String?
    let isPublished: Bool?
    let isFeatured: Bool?
    let level: String?
    let durationHours: Double?
    let orderIndex: Int?
    let parentCourseID: UUID?

    enum CodingKeys: String, CodingKey {
        case id, title, description, price, currency, level
        case thumbnailURL = "thumbnail_url"
        case isPublished = "is_published"
        case isFeatured = "is_featured"
        case durationHours = "duration_hours"
        case orderIndex = "order_index"
        case parentCourseID = "parent_course_id"
    }
}

struct Chapter: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let courseID: UUID
    let title: String
    let coverURL: String?
    let orderIndex: Int

    enum CodingKeys: String, CodingKey {
        case id, title
        case courseID = "course_id"
        case coverURL = "cover_url"
        case orderIndex = "order_index"
    }
}

struct Lesson: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let courseID: UUID
    let title: String
    let description: String?
    let videoID: String?
    let orderIndex: Int
    let durationMinutes: Int?
    let isFreePreview: Bool?
    let isPublished: Bool?
    let thumbnailURL: String?
    let chapter: String?
    let chapterID: UUID?

    enum CodingKeys: String, CodingKey {
        case id, title, description, chapter
        case courseID = "course_id"
        case videoID = "video_id"
        case orderIndex = "order_index"
        case durationMinutes = "duration_minutes"
        case isFreePreview = "is_free_preview"
        case isPublished = "is_published"
        case thumbnailURL = "thumbnail_url"
        case chapterID = "chapter_id"
    }
}

struct Enrollment: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let studentID: UUID
    let courseID: UUID
    let paymentStatus: String?
    let paymentMethod: String?
    let amountPaid: Double?
    let enrolledAt: String?
    let expiresAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case studentID = "student_id"
        case courseID = "course_id"
        case paymentStatus = "payment_status"
        case paymentMethod = "payment_method"
        case amountPaid = "amount_paid"
        case enrolledAt = "enrolled_at"
        case expiresAt = "expires_at"
    }
}

struct LessonProgress: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let studentID: UUID
    let lessonID: UUID
    let completed: Bool?
    let watchPercentage: Int?
    let lastWatchedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, completed
        case studentID = "student_id"
        case lessonID = "lesson_id"
        case watchPercentage = "watch_percentage"
        case lastWatchedAt = "last_watched_at"
    }
}

struct Quiz: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let courseID: UUID
    let title: String
    let description: String?
    let totalMarks: Int
    let passMarks: Int
    let timeLimitMinutes: Int?
    let isPublished: Bool?
    let lessonID: UUID?

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case courseID = "course_id"
        case totalMarks = "total_marks"
        case passMarks = "pass_marks"
        case timeLimitMinutes = "time_limit_minutes"
        case isPublished = "is_published"
        case lessonID = "lesson_id"
    }
}

struct QuizQuestion: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let quizID: UUID
    let questionText: String
    let optionA: String
    let optionB: String
    let optionC: String
    let optionD: String
    let correctAnswer: String?
    let marks: Int
    let orderIndex: Int
    let explanation: String?
    let explanationVideoID: String?
    let questionImageURL: String?
    let questionLinkURL: String?
    let questionLinkText: String?

    enum CodingKeys: String, CodingKey {
        case id
        case quizID = "quiz_id"
        case questionText = "question_text"
        case optionA = "option_a"
        case optionB = "option_b"
        case optionC = "option_c"
        case optionD = "option_d"
        case correctAnswer = "correct_answer"
        case marks
        case orderIndex = "order_index"
        case explanation
        case explanationVideoID = "explanation_video_id"
        case questionImageURL = "question_image_url"
        case questionLinkURL = "question_link_url"
        case questionLinkText = "question_link_text"
    }

    func option(for key: String) -> String {
        switch key {
        case "a": optionA
        case "b": optionB
        case "c": optionC
        default: optionD
        }
    }
}

struct QuizResult: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let studentID: UUID
    let quizID: UUID
    let score: Int
    let totalMarks: Int
    let passed: Bool?
    let answers: [String: String]?
    let takenAt: String?

    enum CodingKeys: String, CodingKey {
        case id, score, passed, answers
        case studentID = "student_id"
        case quizID = "quiz_id"
        case totalMarks = "total_marks"
        case takenAt = "taken_at"
    }
}

struct PlatformNotification: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let userID: UUID
    let title: String
    let body: String
    let type: String?
    let isRead: Bool?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, body, type
        case userID = "user_id"
        case isRead = "is_read"
        case createdAt = "created_at"
    }
}

struct LessonFile: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let lessonID: UUID
    let title: String
    let fileURL: String
    let sizeLabel: String?
    let fileType: String?
    let orderIndex: Int?

    enum CodingKeys: String, CodingKey {
        case id, title
        case lessonID = "lesson_id"
        case fileURL = "file_url"
        case sizeLabel = "size_label"
        case fileType = "file_type"
        case orderIndex = "order_index"
    }
}

struct ParentStudentLink: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let parentID: UUID
    let studentID: UUID

    enum CodingKeys: String, CodingKey {
        case id
        case parentID = "parent_id"
        case studentID = "student_id"
    }
}

struct EnrolledCourse: Identifiable, Sendable, Hashable {
    let enrollment: Enrollment
    let course: Course
    let chapters: [Chapter]
    let lessons: [Lesson]
    let progress: [LessonProgress]

    var id: UUID { enrollment.id }
    var completedCount: Int { progress.filter { $0.completed == true }.count }
    var completionPercentage: Int {
        guard !lessons.isEmpty else { return 0 }
        return Int((Double(completedCount) / Double(lessons.count) * 100).rounded())
    }
    var currentLesson: Lesson? {
        let completed = Set(progress.filter { $0.completed == true }.map(\.lessonID))
        return lessons.first { !completed.contains($0.id) } ?? lessons.first
    }
}

struct StudentDashboardData: Sendable {
    let courses: [EnrolledCourse]
    let quizzes: [Quiz]
    let results: [QuizResult]
    let notifications: [PlatformNotification]

    static let empty = StudentDashboardData(courses: [], quizzes: [], results: [], notifications: [])
}

struct ParentStudentSummary: Identifiable, Sendable {
    let profile: Profile
    let courses: [EnrolledCourse]
    let quizResults: [QuizResult]

    var id: UUID { profile.id }
    var averageScore: Int {
        guard !quizResults.isEmpty else { return 0 }
        return Int((quizResults.reduce(0.0) { sum, result in
            sum + (Double(result.score) / Double(max(result.totalMarks, 1)) * 100)
        } / Double(quizResults.count)).rounded())
    }
}

struct LoadableError: Error, LocalizedError, Sendable {
    let message: String
    var errorDescription: String? { message }
}
