import SwiftUI

struct LessonView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSession.self) private var session

    let courseID: UUID
    let onOpenQuiz: (UUID) -> Void

    @State private var selectedLessonID: UUID?
    @State private var selectedSection: LessonSection = .content
    @State private var files: [LessonFile] = []
    @State private var isLoadingFiles = false
    @State private var message: String?

    private var courseItem: EnrolledCourse? {
        session.dashboard.courses.first { $0.course.id == courseID }
    }

    private var selectedLesson: Lesson? {
        guard let item = courseItem else { return nil }
        return item.lessons.first { $0.id == selectedLessonID } ?? item.currentLesson ?? item.lessons.first
    }

    private var selectedProgress: LessonProgress? {
        guard let lesson = selectedLesson else { return nil }
        return courseItem?.progress.first { $0.lessonID == lesson.id }
    }

    private var relatedQuiz: Quiz? {
        guard let lesson = selectedLesson else { return nil }
        return session.dashboard.quizzes.first { $0.lessonID == lesson.id }
            ?? session.dashboard.quizzes.first { $0.courseID == courseID }
    }

    var body: some View {
        ZStack {
            AmbientBackdrop()

            if let item = courseItem, !item.lessons.isEmpty {
                ScrollView {
                    LazyVStack(spacing: 20) {
                        topBar(title: item.course.title)
                        courseProgress(item)
                        lessonSelector(item)

                        if let lesson = selectedLesson {
                            lessonHeader(lesson)
                            SecureVideoPlayerView(lesson: lesson) {
                                Task { await complete(lesson) }
                            }
                            sectionPicker
                            sectionContent(lesson: lesson, item: item)

                            if let quiz = relatedQuiz {
                                PrimaryGradientButton(title: "اختبر فهمك", symbol: "target") {
                                    onOpenQuiz(quiz.id)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 42)
                }
                .scrollIndicators(.hidden)
                .refreshable { await session.refresh() }
            } else {
                ContentUnavailableView(
                    "لا توجد دروس متاحة",
                    systemImage: "books.vertical",
                    description: Text("قد يكون الاشتراك غير نشط أو لم يُنشر محتوى الكورس بعد.")
                )
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task {
            if selectedLessonID == nil { selectedLessonID = courseItem?.currentLesson?.id ?? courseItem?.lessons.first?.id }
        }
        .task(id: selectedLessonID) { await loadFiles() }
        .alert("قدرات المغربي", isPresented: Binding(
            get: { message != nil },
            set: { if !$0 { message = nil } }
        )) {
            Button("حسنًا", role: .cancel) { message = nil }
        } message: {
            Text(message ?? "")
        }
    }

    private func topBar(title: String) -> some View {
        HStack {
            TopCircleButton(symbol: "xmark") { dismiss() }
            Spacer()
            Text(title)
                .font(QMTheme.font(.bold, size: 17))
                .foregroundStyle(QMTheme.ink)
                .lineLimit(1)
            Spacer()
            Image("BrandLogo")
                .resizable()
                .scaledToFit()
                .padding(5)
                .frame(width: 42, height: 42)
                .qmGlass(cornerRadius: 14)
        }
    }

    private func courseProgress(_ item: EnrolledCourse) -> some View {
        VStack(alignment: .trailing, spacing: 9) {
            HStack {
                Text("\(item.completionPercentage)%")
                    .font(QMTheme.font(.black, size: 15))
                    .foregroundStyle(QMTheme.violet)
                Spacer()
                Text("تقدّم الكورس")
                    .font(QMTheme.font(.regular, size: 12))
                    .foregroundStyle(QMTheme.muted)
            }
            CapsuleProgress(progress: Double(item.completionPercentage) / 100)
        }
        .padding(16)
        .qmGlass(cornerRadius: 20, tint: QMTheme.violet.opacity(0.03))
    }

    private func lessonSelector(_ item: EnrolledCourse) -> some View {
        ScrollView(.horizontal) {
            HStack(spacing: 10) {
                ForEach(item.lessons) { lesson in
                    let isSelected = selectedLesson?.id == lesson.id
                    let isComplete = item.progress.first { $0.lessonID == lesson.id }?.completed == true
                    Button {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                            selectedLessonID = lesson.id
                            selectedSection = .content
                        }
                    } label: {
                        HStack(spacing: 7) {
                            Image(systemName: isComplete ? "checkmark.circle.fill" : "play.circle.fill")
                            Text(lesson.title).lineLimit(1)
                        }
                        .font(QMTheme.font(.bold, size: 11))
                        .foregroundStyle(isSelected ? .white : (isComplete ? QMTheme.success : QMTheme.ink))
                        .padding(.horizontal, 14)
                        .frame(height: 42)
                        .background(isSelected ? AnyShapeStyle(QMTheme.purpleGradient) : AnyShapeStyle(.white.opacity(0.72)), in: Capsule())
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
            }
            .padding(.vertical, 7)
        }
        .scrollIndicators(.hidden)
    }

    private func lessonHeader(_ lesson: Lesson) -> some View {
        VStack(alignment: .trailing, spacing: 7) {
            HStack(spacing: 8) {
                if selectedProgress?.completed == true {
                    Label("مكتمل", systemImage: "checkmark.seal.fill")
                        .font(QMTheme.font(.bold, size: 10))
                        .foregroundStyle(QMTheme.success)
                }
                Spacer()
                Text(lesson.chapter ?? "الدرس الحالي")
                    .font(QMTheme.font(.regular, size: 11))
                    .foregroundStyle(QMTheme.violet)
            }
            Text(lesson.title)
                .font(QMTheme.font(.black, size: 28))
                .foregroundStyle(QMTheme.ink)
                .frame(maxWidth: .infinity, alignment: .trailing)
            if let minutes = lesson.durationMinutes, minutes > 0 {
                Label("\(minutes) دقيقة", systemImage: "clock.fill")
                    .font(QMTheme.font(.regular, size: 11))
                    .foregroundStyle(QMTheme.muted)
            }
        }
    }

    private var sectionPicker: some View {
        HStack(spacing: 7) {
            ForEach(LessonSection.allCases) { section in
                Button {
                    withAnimation(.easeInOut(duration: 0.22)) { selectedSection = section }
                } label: {
                    Label(section.title, systemImage: section.symbol)
                        .font(QMTheme.font(.bold, size: 11))
                        .foregroundStyle(selectedSection == section ? .white : QMTheme.muted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 42)
                        .background(selectedSection == section ? AnyShapeStyle(QMTheme.purpleGradient) : AnyShapeStyle(.clear), in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(5)
        .qmGlass(cornerRadius: 24)
    }

    @ViewBuilder
    private func sectionContent(lesson: Lesson, item: EnrolledCourse) -> some View {
        switch selectedSection {
        case .content:
            VStack(alignment: .trailing, spacing: 12) {
                SectionTitle(title: "ملخص الدرس", subtitle: "الفكرة في كلمات واضحة ومباشرة")
                Text((lesson.description?.isEmpty == false ? lesson.description : nil) ?? "لم يُضف ملخص لهذا الدرس بعد.")
                    .font(QMTheme.font(.regular, size: 14))
                    .foregroundStyle(QMTheme.muted)
                    .lineSpacing(7)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(19)
                    .qmGlass(cornerRadius: 24)
            }
        case .files:
            VStack(alignment: .trailing, spacing: 12) {
                SectionTitle(title: "ملفات الدرس", subtitle: "المرفقات والمذكرات في مكان واحد")
                if isLoadingFiles {
                    ProgressView().frame(maxWidth: .infinity).padding(30)
                } else if files.isEmpty {
                    emptyMini(title: "لا توجد مرفقات لهذا الدرس", symbol: "doc.text")
                } else {
                    ForEach(files) { file in
                        if let url = URL(string: file.fileURL) {
                            Link(destination: url) { LessonFileRow(file: file) }
                        }
                    }
                }
            }
        case .chapters:
            VStack(alignment: .trailing, spacing: 12) {
                SectionTitle(title: "خريطة الكورس", subtitle: "اعرف موقعك والخطوة التالية")
                ForEach(item.chapters) { chapter in
                    let count = item.lessons.filter { $0.chapterID == chapter.id }.count
                    HStack {
                        Text("\(count) دروس")
                            .font(QMTheme.font(.regular, size: 10))
                            .foregroundStyle(QMTheme.muted)
                        Spacer()
                        Text(chapter.title)
                            .font(QMTheme.font(.bold, size: 14))
                            .foregroundStyle(QMTheme.ink)
                        Image(systemName: chapter.id == lesson.chapterID ? "location.fill" : "circle")
                            .foregroundStyle(chapter.id == lesson.chapterID ? QMTheme.violet : QMTheme.muted.opacity(0.35))
                    }
                    .padding(15)
                    .qmGlass(cornerRadius: 19, tint: chapter.id == lesson.chapterID ? QMTheme.violet.opacity(0.04) : nil)
                }
            }
        }
    }

    private func emptyMini(title: String, symbol: String) -> some View {
        Label(title, systemImage: symbol)
            .font(QMTheme.font(.regular, size: 13))
            .foregroundStyle(QMTheme.muted)
            .frame(maxWidth: .infinity)
            .padding(26)
            .qmGlass(cornerRadius: 22)
    }

    private func loadFiles() async {
        guard let id = selectedLesson?.id else { return }
        isLoadingFiles = true
        do {
            files = try await session.service.fetchLessonFiles(lessonID: id)
        } catch is CancellationError {
            return
        } catch {
            files = []
        }
        isLoadingFiles = false
    }

    private func complete(_ lesson: Lesson) async {
        guard let userID = session.userID else { return }
        do {
            _ = try await session.service.markLesson(lessonID: lesson.id, studentID: userID, percentage: 100, completed: true)
            await session.refresh()
            message = "أحسنت! تم تسجيل إتمام الدرس."
        } catch {
            message = error.localizedDescription
        }
    }
}

private enum LessonSection: String, CaseIterable, Identifiable {
    case content, files, chapters
    var id: String { rawValue }
    var title: String {
        switch self { case .content: "الملخص"; case .files: "الملفات"; case .chapters: "الخريطة" }
    }
    var symbol: String {
        switch self { case .content: "text.book.closed.fill"; case .files: "paperclip"; case .chapters: "map.fill" }
    }
}

private struct LessonFileRow: View {
    let file: LessonFile
    var body: some View {
        HStack(spacing: 13) {
            Image(systemName: "arrow.down.circle.fill")
                .font(.system(size: 20))
                .foregroundStyle(QMTheme.violet)
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(file.title).font(QMTheme.font(.bold, size: 13)).foregroundStyle(QMTheme.ink)
                Text([file.fileType, file.sizeLabel].compactMap { $0 }.joined(separator: " • "))
                    .font(QMTheme.font(.regular, size: 9)).foregroundStyle(QMTheme.muted)
            }
            Image(systemName: "doc.fill")
                .foregroundStyle(QMTheme.magenta)
                .frame(width: 42, height: 42)
                .background(QMTheme.magenta.opacity(0.09), in: RoundedRectangle(cornerRadius: 14))
        }
        .padding(14)
        .qmGlass(cornerRadius: 20, interactive: true)
    }
}
