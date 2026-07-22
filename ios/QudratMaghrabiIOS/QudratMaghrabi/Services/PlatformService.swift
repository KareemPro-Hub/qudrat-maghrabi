import Foundation
import Supabase

final class PlatformService: @unchecked Sendable {
    let client: SupabaseClient
    private let configuration: AppConfiguration

    init(client: SupabaseClient, configuration: AppConfiguration) {
        self.client = client
        self.configuration = configuration
    }

    func fetchProfile(userID: UUID) async throws -> Profile {
        let rows: [Profile] = try await client
            .from("profiles")
            .select()
            .eq("id", value: userID.uuidString)
            .limit(1)
            .execute()
            .value

        guard let profile = rows.first else {
            throw LoadableError(message: "تعذّر العثور على الملف الشخصي لهذا الحساب.")
        }
        guard profile.isActive != false else {
            throw LoadableError(message: "هذا الحساب غير نشط. تواصل مع إدارة المنصة.")
        }
        return profile
    }

    func fetchStudentDashboard(studentID: UUID, includeNotifications: Bool = true) async throws -> StudentDashboardData {
        async let enrollmentsRequest: [Enrollment] = client
            .from("enrollments")
            .select()
            .eq("student_id", value: studentID.uuidString)
            .eq("payment_status", value: "paid")
            .order("enrolled_at", ascending: false)
            .execute()
            .value

        async let progressRequest: [LessonProgress] = client
            .from("lesson_progress")
            .select()
            .eq("student_id", value: studentID.uuidString)
            .execute()
            .value

        async let resultsRequest: [QuizResult] = client
            .from("quiz_results")
            .select()
            .eq("student_id", value: studentID.uuidString)
            .order("taken_at", ascending: false)
            .execute()
            .value

        let enrollments = try await enrollmentsRequest
        let allProgress = try await progressRequest
        let results = try await resultsRequest

        var courses: [EnrolledCourse] = []
        var quizzes: [Quiz] = []

        for enrollment in enrollments {
            guard let course = try await fetchCourse(id: enrollment.courseID) else { continue }
            async let chapters = fetchChapters(courseID: course.id)
            async let lessons = fetchLessons(courseID: course.id)
            async let courseQuizzes = fetchQuizzes(courseID: course.id)

            let loadedLessons = try await lessons
            let lessonIDs = Set(loadedLessons.map(\.id))
            let courseProgress = allProgress.filter { lessonIDs.contains($0.lessonID) }
            courses.append(
                EnrolledCourse(
                    enrollment: enrollment,
                    course: course,
                    chapters: try await chapters,
                    lessons: loadedLessons,
                    progress: courseProgress
                )
            )
            quizzes.append(contentsOf: try await courseQuizzes)
        }

        let notifications: [PlatformNotification]
        if includeNotifications {
            notifications = try await fetchNotifications(userID: studentID)
        } else {
            notifications = []
        }

        return StudentDashboardData(
            courses: courses,
            quizzes: quizzes,
            results: results,
            notifications: notifications
        )
    }

    func fetchCourse(id: UUID) async throws -> Course? {
        let rows: [Course] = try await client
            .from("courses")
            .select()
            .eq("id", value: id.uuidString)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    func fetchPublishedCourses() async throws -> [Course] {
        try await client
            .from("courses")
            .select()
            .eq("is_published", value: true)
            .order("order_index")
            .execute()
            .value
    }

    func fetchChapters(courseID: UUID) async throws -> [Chapter] {
        try await client
            .from("chapters")
            .select()
            .eq("course_id", value: courseID.uuidString)
            .order("order_index")
            .execute()
            .value
    }

    func fetchLessons(courseID: UUID) async throws -> [Lesson] {
        try await client
            .from("lessons")
            .select()
            .eq("course_id", value: courseID.uuidString)
            .eq("is_published", value: true)
            .order("order_index")
            .execute()
            .value
    }

    func fetchLessonFiles(lessonID: UUID) async throws -> [LessonFile] {
        try await client
            .from("lesson_files")
            .select()
            .eq("lesson_id", value: lessonID.uuidString)
            .order("order_index")
            .execute()
            .value
    }

    func fetchQuizzes(courseID: UUID) async throws -> [Quiz] {
        try await client
            .from("quizzes")
            .select()
            .eq("course_id", value: courseID.uuidString)
            .eq("is_published", value: true)
            .execute()
            .value
    }

    func fetchQuiz(id: UUID) async throws -> Quiz {
        let rows: [Quiz] = try await client
            .from("quizzes")
            .select()
            .eq("id", value: id.uuidString)
            .eq("is_published", value: true)
            .limit(1)
            .execute()
            .value
        guard let quiz = rows.first else {
            throw LoadableError(message: "هذا الاختبار غير متاح حاليًا.")
        }
        return quiz
    }

    func fetchQuestions(quizID: UUID) async throws -> [QuizQuestion] {
        try await client
            .rpc("get_quiz_questions_for_student", params: QuizQuestionsParams(quizID: quizID))
            .execute()
            .value
    }

    func markLesson(lessonID: UUID, studentID: UUID, percentage: Int, completed: Bool) async throws -> LessonProgress {
        let rows: [LessonProgress] = try await client
            .from("lesson_progress")
            .select()
            .eq("student_id", value: studentID.uuidString)
            .eq("lesson_id", value: lessonID.uuidString)
            .limit(1)
            .execute()
            .value

        let safePercentage = min(max(percentage, 0), 100)
        if let existing = rows.first {
            let payload = ProgressUpdate(
                completed: completed || existing.completed == true,
                watchPercentage: max(safePercentage, existing.watchPercentage ?? 0),
                lastWatchedAt: ISO8601DateFormatter().string(from: Date())
            )
            let updated: LessonProgress = try await client
                .from("lesson_progress")
                .update(payload)
                .eq("id", value: existing.id.uuidString)
                .select()
                .single()
                .execute()
                .value
            return updated
        }

        let inserted: LessonProgress = try await client
            .from("lesson_progress")
            .insert(
                ProgressInsert(
                    studentID: studentID,
                    lessonID: lessonID,
                    completed: completed,
                    watchPercentage: safePercentage
                )
            )
            .select()
            .single()
            .execute()
            .value
        return inserted
    }

    func submitQuiz(quizID: UUID, answers: [UUID: String]) async throws -> QuizResult {
        let encodedAnswers = Dictionary(uniqueKeysWithValues: answers.map { ($0.key.uuidString, $0.value) })
        let results: [QuizResult] = try await client
            .rpc("submit_quiz_attempt", params: QuizSubmitParams(quizID: quizID, answers: encodedAnswers))
            .execute()
            .value
        guard let result = results.first else {
            throw LoadableError(message: "تعذّر حفظ نتيجة الاختبار.")
        }
        return result
    }

    func fetchNotifications(userID: UUID) async throws -> [PlatformNotification] {
        try await client
            .from("notifications")
            .select()
            .eq("user_id", value: userID.uuidString)
            .order("created_at", ascending: false)
            .limit(40)
            .execute()
            .value
    }

    func markNotificationsRead(userID: UUID) async throws {
        try await client
            .from("notifications")
            .update(NotificationReadUpdate(isRead: true))
            .eq("user_id", value: userID.uuidString)
            .eq("is_read", value: false)
            .execute()
    }

    func updateProfile(userID: UUID, fullName: String, phone: String?) async throws -> Profile {
        try await client
            .from("profiles")
            .update(ProfileUpdate(fullName: fullName, phone: phone))
            .eq("id", value: userID.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    func fetchParentStudents(parentID: UUID) async throws -> [ParentStudentSummary] {
        let links: [ParentStudentLink] = try await client
            .from("parent_student")
            .select()
            .eq("parent_id", value: parentID.uuidString)
            .execute()
            .value

        var summaries: [ParentStudentSummary] = []
        for link in links {
            let profile = try await fetchProfile(userID: link.studentID)
            let dashboard = try await fetchStudentDashboard(studentID: link.studentID, includeNotifications: false)
            summaries.append(
                ParentStudentSummary(
                    profile: profile,
                    courses: dashboard.courses,
                    quizResults: dashboard.results
                )
            )
        }
        return summaries
    }

    func signedVideoURL(videoID: String, courseID: UUID) async throws -> URL {
        let accessToken = try await client.auth.session.accessToken
        let endpoint = configuration.apiBaseURL.appending(path: "api/bunny-token")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(BunnyTokenRequest(videoID: videoID, courseID: courseID.uuidString))

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            let apiError = try? JSONDecoder().decode(APIErrorResponse.self, from: data)
            throw LoadableError(message: apiError?.error ?? "تعذّر تشغيل الفيديو الآن.")
        }

        let token = try JSONDecoder().decode(BunnyTokenResponse.self, from: data)
        var components = URLComponents(string: "https://iframe.mediadelivery.net/embed/\(token.libraryID)/\(videoID)")
        components?.queryItems = [
            URLQueryItem(name: "token", value: token.token),
            URLQueryItem(name: "expires", value: String(token.expires)),
            URLQueryItem(name: "autoplay", value: "true")
        ]
        guard let url = components?.url else {
            throw LoadableError(message: "تعذّر إنشاء رابط الفيديو الآمن.")
        }
        return url
    }

    func deleteCurrentAccount() async throws {
        try await client.rpc("delete_my_account").execute()
    }
}

private struct ProgressInsert: Encodable {
    let studentID: UUID
    let lessonID: UUID
    let completed: Bool
    let watchPercentage: Int

    enum CodingKeys: String, CodingKey {
        case studentID = "student_id"
        case lessonID = "lesson_id"
        case completed
        case watchPercentage = "watch_percentage"
    }
}

private struct ProgressUpdate: Encodable {
    let completed: Bool
    let watchPercentage: Int
    let lastWatchedAt: String

    enum CodingKeys: String, CodingKey {
        case completed
        case watchPercentage = "watch_percentage"
        case lastWatchedAt = "last_watched_at"
    }
}

private struct QuizQuestionsParams: Encodable {
    let quizID: UUID
    enum CodingKeys: String, CodingKey { case quizID = "p_quiz_id" }
}

private struct QuizSubmitParams: Encodable {
    let quizID: UUID
    let answers: [String: String]
    enum CodingKeys: String, CodingKey {
        case quizID = "p_quiz_id"
        case answers = "p_answers"
    }
}

private struct NotificationReadUpdate: Encodable {
    let isRead: Bool
    enum CodingKeys: String, CodingKey { case isRead = "is_read" }
}

private struct ProfileUpdate: Encodable {
    let fullName: String
    let phone: String?
    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case phone
    }
}

private struct BunnyTokenRequest: Encodable {
    let videoID: String
    let courseID: String
    enum CodingKeys: String, CodingKey {
        case videoID = "videoId"
        case courseID = "courseId"
    }
}

private struct BunnyTokenResponse: Decodable {
    let libraryID: String
    let token: String
    let expires: Int
    enum CodingKeys: String, CodingKey {
        case libraryID = "libraryId"
        case token, expires
    }
}

private struct APIErrorResponse: Decodable {
    let error: String
}
