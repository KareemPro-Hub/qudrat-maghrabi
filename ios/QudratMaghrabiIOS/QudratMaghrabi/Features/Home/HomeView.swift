import SwiftUI

struct HomeView: View {
    @Environment(AppSession.self) private var session
    let onOpenCourse: (UUID) -> Void
    let onOpenQuiz: (UUID) -> Void
    let onOpenNotifications: () -> Void

    private var primary: EnrolledCourse? { session.dashboard.courses.first }
    private var averageScore: Int {
        let results = session.dashboard.results
        guard !results.isEmpty else { return 0 }
        return Int((results.reduce(0.0) { sum, result in
            sum + Double(result.score) / Double(max(result.totalMarks, 1)) * 100
        } / Double(results.count)).rounded())
    }
    private var overallCompletion: Int {
        let courses = session.dashboard.courses
        guard !courses.isEmpty else { return 0 }
        return Int((Double(courses.reduce(0) { $0 + $1.completionPercentage }) / Double(courses.count)).rounded())
    }
    private var unreadCount: Int {
        session.dashboard.notifications.filter { $0.isRead == false }.count
    }
    private var availableCourses: [Course] {
        let enrolledCourseIDs = Set(session.dashboard.courses.map(\.course.id))
        return session.catalogCourses.filter { !enrolledCourseIDs.contains($0.id) }
    }

    var body: some View {
        ZStack {
            AmbientBackdrop()

            ScrollView {
                LazyVStack(spacing: 20) {
                    topBar
                    greeting

                    if let primary {
                        ContinueCourseCard(item: primary) {
                            onOpenCourse(primary.course.id)
                        }
                        progressSummary
                        quickActions
                        enrolledCourses
                        latestResult
                    } else {
                        EmptyEnrollmentCard()
                    }

                    if !availableCourses.isEmpty {
                        PublishedCourseCatalog(courses: availableCourses)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 126)
            }
            .scrollIndicators(.hidden)
            .refreshable { await session.refresh() }
        }
    }

    private var topBar: some View {
        HStack {
            Image("BrandLogo")
                .resizable()
                .scaledToFit()
                .padding(7)
                .frame(width: 52, height: 52)
                .qmGlass(cornerRadius: 17, tint: .white.opacity(0.16))

            Spacer()

            Button(action: onOpenNotifications) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bell.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(QMTheme.ink)
                        .frame(width: 44, height: 44)
                        .qmGlass(cornerRadius: 16, interactive: true)

                    if unreadCount > 0 {
                        Text("\(min(unreadCount, 9))")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 16, height: 16)
                            .background(QMTheme.pink, in: Circle())
                            .overlay(Circle().stroke(.white, lineWidth: 2))
                    }
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("الإشعارات")
        }
    }

    private var greeting: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("أهلًا \(session.profile?.firstName ?? "بك") 👋")
                .font(QMTheme.font(.regular, size: 16))
                .foregroundStyle(QMTheme.muted)

            HStack(spacing: 5) {
                Text("مستعد نكمّل للـ")
                    .font(QMTheme.font(.black, size: 27))
                    .foregroundStyle(QMTheme.ink)
                Text(verbatim: "95+؟")
                    .font(QMTheme.font(.black, size: 28))
                    .foregroundStyle(QMTheme.brandGradient)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var progressSummary: some View {
        QMGlassGroup(spacing: 11) {
            HStack(spacing: 11) {
                DashboardStat(value: "\(overallCompletion)%", label: "الإنجاز", symbol: "target", tint: QMTheme.violet)
                DashboardStat(value: "\(averageScore)%", label: "متوسط الاختبارات", symbol: "chart.line.uptrend.xyaxis", tint: QMTheme.magenta)
                DashboardStat(
                    value: "\(session.dashboard.courses.reduce(0) { $0 + $1.completedCount })",
                    label: "درس مكتمل",
                    symbol: "checkmark.seal.fill",
                    tint: QMTheme.success
                )
            }
        }
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(title: "ابدأ بسرعة", subtitle: "كل ما تحتاجه في ضغطة واحدة")

            QMGlassGroup(spacing: 12) {
                HStack(spacing: 12) {
                    if let quiz = session.dashboard.quizzes.first {
                        QuickHomeButton(
                            title: "اختبار سريع",
                            subtitle: "\(quiz.totalMarks) درجات",
                            symbol: "timer",
                            tint: QMTheme.violet
                        ) { onOpenQuiz(quiz.id) }
                    }

                    if let course = primary {
                        QuickHomeButton(
                            title: "أكمل الدرس",
                            subtitle: course.currentLesson?.title ?? "محتوى الكورس",
                            symbol: "play.fill",
                            tint: QMTheme.magenta
                        ) { onOpenCourse(course.course.id) }
                    }
                }
            }
        }
    }

    private var enrolledCourses: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(title: "كورساتك", subtitle: "رحلتك مرتبة وواضحة")
            ForEach(session.dashboard.courses) { item in
                Button { onOpenCourse(item.course.id) } label: {
                    CourseProgressRow(item: item)
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private var latestResult: some View {
        if let result = session.dashboard.results.first,
           let quiz = session.dashboard.quizzes.first(where: { $0.id == result.quizID }) {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "آخر نتيجة", subtitle: "كل محاولة تقرّبك أكثر")
                HStack(spacing: 16) {
                    Text("\(Int((Double(result.score) / Double(max(result.totalMarks, 1)) * 100).rounded()))%")
                        .font(QMTheme.font(.black, size: 30))
                        .foregroundStyle(result.passed == true ? QMTheme.success : QMTheme.coral)
                    Spacer()
                    VStack(alignment: .leading, spacing: 5) {
                        Text(quiz.title)
                            .font(QMTheme.font(.bold, size: 15))
                            .foregroundStyle(QMTheme.ink)
                        Text(result.passed == true ? "أحسنت، اجتزت الاختبار" : "راجع الدرس وجرّب مرة أخرى")
                            .font(QMTheme.font(.regular, size: 11))
                            .foregroundStyle(QMTheme.muted)
                    }
                }
                .padding(17)
                .qmGlass(cornerRadius: 22, tint: (result.passed == true ? QMTheme.success : QMTheme.coral).opacity(0.04))
            }
        }
    }
}

private struct ContinueCourseCard: View {
    let item: EnrolledCourse
    let action: () -> Void

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .fill(QMTheme.brandGradient)
                .overlay(alignment: .topLeading) {
                    Circle()
                        .fill(.white.opacity(0.22))
                        .frame(width: 180, height: 180)
                        .blur(radius: 38)
                        .offset(x: -52, y: -64)
                }

            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top, spacing: 14) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("أكمل من حيث توقفت")
                            .font(QMTheme.font(.regular, size: 12))
                            .foregroundStyle(.white.opacity(0.76))
                        Text(item.course.title)
                            .font(QMTheme.font(.black, size: 25))
                            .foregroundStyle(.white)
                        Text(item.currentLesson?.title ?? "ابدأ أول درس")
                            .font(QMTheme.font(.bold, size: 13))
                            .foregroundStyle(.white.opacity(0.82))
                    }
                    Spacer()
                    ZStack {
                        Circle().stroke(.white.opacity(0.18), lineWidth: 7)
                        Circle()
                            .trim(from: 0, to: Double(item.completionPercentage) / 100)
                            .stroke(QMTheme.gold, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Text("\(item.completionPercentage)%")
                            .font(QMTheme.font(.black, size: 14))
                            .foregroundStyle(.white)
                    }
                    .frame(width: 70, height: 70)
                }

                CapsuleProgress(progress: Double(item.completionPercentage) / 100, tint: .white)

                Button(action: action) {
                    Label("أكمل الكورس", systemImage: "arrow.left")
                        .font(QMTheme.font(.bold, size: 15))
                        .foregroundStyle(QMTheme.ink)
                        .frame(maxWidth: .infinity)
                        .frame(height: 49)
                        .background(QMTheme.gold, in: Capsule())
                }
                .buttonStyle(ScaleButtonStyle())
            }
            .padding(22)
        }
        .frame(minHeight: 242)
        .overlay {
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .stroke(.white.opacity(0.34))
        }
        .shadow(color: QMTheme.violet.opacity(0.3), radius: 30, y: 18)
    }
}

private struct DashboardStat: View {
    let value: String
    let label: String
    let symbol: String
    let tint: Color

    var body: some View {
        VStack(spacing: 7) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(tint)
            Text(value)
                .font(QMTheme.font(.black, size: 18))
                .foregroundStyle(QMTheme.ink)
            Text(label)
                .font(QMTheme.font(.regular, size: 9))
                .foregroundStyle(QMTheme.muted)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .qmGlass(cornerRadius: 21, tint: tint.opacity(0.03))
    }
}

private struct QuickHomeButton: View {
    let title: String
    let subtitle: String
    let symbol: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: symbol)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 42, height: 42)
                    .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                Text(title)
                    .font(QMTheme.font(.bold, size: 13))
                    .foregroundStyle(QMTheme.ink)
                Text(subtitle)
                    .font(QMTheme.font(.regular, size: 9))
                    .foregroundStyle(QMTheme.muted)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(15)
            .qmGlass(cornerRadius: 22, tint: tint.opacity(0.04), interactive: true)
        }
        .buttonStyle(.plain)
    }
}

private struct CourseProgressRow: View {
    let item: EnrolledCourse

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "chevron.left")
                .foregroundStyle(QMTheme.violet)
            Spacer()
            VStack(alignment: .leading, spacing: 7) {
                Text(item.course.title)
                    .font(QMTheme.font(.bold, size: 15))
                    .foregroundStyle(QMTheme.ink)
                Text("\(item.completedCount) من \(item.lessons.count) درسًا")
                    .font(QMTheme.font(.regular, size: 10))
                    .foregroundStyle(QMTheme.muted)
                CapsuleProgress(progress: Double(item.completionPercentage) / 100)
            }
            ZStack {
                Circle().fill(QMTheme.softViolet)
                Text("\(item.completionPercentage)%")
                    .font(QMTheme.font(.black, size: 12))
                    .foregroundStyle(QMTheme.violet)
            }
            .frame(width: 56, height: 56)
        }
        .padding(15)
        .qmGlass(cornerRadius: 22, interactive: true)
    }
}

private struct EmptyEnrollmentCard: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "books.vertical.fill")
                .font(.system(size: 36))
                .foregroundStyle(QMTheme.violet)
            Text("رحلتك جاهزة للانطلاق")
                .font(QMTheme.font(.black, size: 23))
                .foregroundStyle(QMTheme.ink)
            Text("لم تُفعّل كورسًا على حسابك بعد. يمكنك استعراض كل كورسات المنصة المتاحة بالأسفل والاشتراك في المناسب لك.")
                .font(QMTheme.font(.regular, size: 13))
                .foregroundStyle(QMTheme.muted)
                .multilineTextAlignment(.center)
            Button {
                Task { await session.refresh() }
            } label: {
                Label("تحديث كورساتي", systemImage: "arrow.clockwise")
                    .font(QMTheme.font(.bold, size: 14))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(QMTheme.purpleGradient, in: Capsule())
            }
        }
        .padding(24)
        .qmGlass(cornerRadius: 28)
    }
}

struct LessonLibraryView: View {
    @Environment(AppSession.self) private var session
    let onOpenCourse: (UUID) -> Void

    private var availableCourses: [Course] {
        let enrolledCourseIDs = Set(session.dashboard.courses.map(\.course.id))
        return session.catalogCourses.filter { !enrolledCourseIDs.contains($0.id) }
    }

    var body: some View {
        ZStack {
            AmbientBackdrop()
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    Text("مكتبة التعلّم")
                        .font(QMTheme.font(.black, size: 30))
                        .foregroundStyle(QMTheme.ink)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text("كورساتك الحالية وكل ما هو متاح على المنصة.")
                        .font(QMTheme.font(.regular, size: 13))
                        .foregroundStyle(QMTheme.muted)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if !session.dashboard.courses.isEmpty {
                        SectionTitle(title: "كورساتك", subtitle: "الكورسات المفعّلة على حسابك")
                        ForEach(session.dashboard.courses) { item in
                            Button { onOpenCourse(item.course.id) } label: {
                                CourseLibraryCard(item: item)
                            }
                            .buttonStyle(.plain)
                        }
                    } else {
                        EmptyEnrollmentCard()
                    }

                    if !availableCourses.isEmpty {
                        PublishedCourseCatalog(courses: availableCourses)
                    }
                }
                .padding(20)
                .padding(.bottom, 120)
            }
            .scrollIndicators(.hidden)
            .refreshable { await session.refresh() }
        }
    }
}

private struct PublishedCourseCatalog: View {
    @Environment(AppSession.self) private var session
    let courses: [Course]

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            SectionTitle(title: "الكورسات المتاحة", subtitle: "استعرض كورسات المنصة واختر رحلتك القادمة")

            ForEach(courses) { course in
                Link(destination: session.courseURL(for: course.id)) {
                    PublishedCourseCard(
                        course: course,
                        childCount: courses.filter { $0.parentCourseID == course.id }.count
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("استعراض كورس \(course.title)")
            }
        }
    }
}

private struct PublishedCourseCard: View {
    let course: Course
    let childCount: Int

    private var priceLabel: String {
        if childCount > 0 { return "باقة · \(childCount) كورس" }
        guard course.price > 0 else { return "مجاني" }
        let amount = course.price.formatted(
            .number
                .precision(.fractionLength(course.price.rounded() == course.price ? 0 : 2))
                .locale(Locale(identifier: "ar_EG"))
        )
        return "\(amount) \(course.currency ?? "جنيه")"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                AsyncImage(url: URL(string: course.thumbnailURL ?? "")) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    ZStack {
                        QMTheme.brandGradient
                        Image(systemName: "function")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .frame(width: 82, height: 82)
                .clipShape(RoundedRectangle(cornerRadius: 21, style: .continuous))

                VStack(alignment: .leading, spacing: 7) {
                    if course.parentCourseID != nil {
                        Text("ضمن باقة")
                            .font(QMTheme.font(.bold, size: 9))
                            .foregroundStyle(QMTheme.magenta)
                    }
                    Text(course.title)
                        .font(QMTheme.font(.black, size: 18))
                        .foregroundStyle(QMTheme.ink)
                        .multilineTextAlignment(.leading)
                    if let description = course.description, !description.isEmpty {
                        Text(description)
                            .font(QMTheme.font(.regular, size: 10))
                            .foregroundStyle(QMTheme.muted)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack {
                Label("استعرض الكورس", systemImage: "arrow.up.left")
                    .font(QMTheme.font(.bold, size: 12))
                    .foregroundStyle(QMTheme.violet)
                Spacer()
                Text(priceLabel)
                    .font(QMTheme.font(.black, size: 13))
                    .foregroundStyle(childCount > 0 ? QMTheme.violet : (course.price > 0 ? QMTheme.ink : QMTheme.success))
            }
        }
        .padding(17)
        .qmGlass(cornerRadius: 25, tint: QMTheme.violet.opacity(0.05), interactive: true)
    }
}

private struct CourseLibraryCard: View {
    let item: EnrolledCourse

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                Image(systemName: "chevron.left")
                    .foregroundStyle(QMTheme.violet)
                Spacer()
                VStack(alignment: .leading, spacing: 5) {
                    Text(item.course.title)
                        .font(QMTheme.font(.black, size: 19))
                        .foregroundStyle(QMTheme.ink)
                    Text(item.currentLesson?.title ?? "ابدأ أول درس")
                        .font(QMTheme.font(.regular, size: 11))
                        .foregroundStyle(QMTheme.muted)
                }
                AsyncImage(url: URL(string: item.course.thumbnailURL ?? "")) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Image(systemName: "function")
                        .font(.system(size: 23, weight: .semibold))
                        .foregroundStyle(QMTheme.violet)
                }
                .frame(width: 62, height: 62)
                .background(QMTheme.softViolet)
                .clipShape(RoundedRectangle(cornerRadius: 19, style: .continuous))
            }

            CapsuleProgress(progress: Double(item.completionPercentage) / 100)
            HStack {
                Text("\(item.completionPercentage)%")
                    .font(QMTheme.font(.black, size: 13))
                    .foregroundStyle(QMTheme.violet)
                Spacer()
                Text("\(item.lessons.count) درسًا • \(item.chapters.count) أبواب")
                    .font(QMTheme.font(.regular, size: 10))
                    .foregroundStyle(QMTheme.muted)
            }
        }
        .padding(17)
        .qmGlass(cornerRadius: 24, interactive: true)
    }
}
