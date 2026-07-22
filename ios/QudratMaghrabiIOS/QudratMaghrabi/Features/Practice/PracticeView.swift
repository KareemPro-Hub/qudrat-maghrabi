import SwiftUI

struct PracticeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSession.self) private var session

    let quizID: UUID

    @State private var quiz: Quiz?
    @State private var questions: [QuizQuestion] = []
    @State private var answers: [UUID: String] = [:]
    @State private var questionIndex = 0
    @State private var secondsRemaining = 0
    @State private var isLoading = true
    @State private var isSubmitting = false
    @State private var result: QuizResult?
    @State private var errorMessage: String?

    private var currentQuestion: QuizQuestion? {
        questions.indices.contains(questionIndex) ? questions[questionIndex] : nil
    }

    var body: some View {
        ZStack {
            AmbientBackdrop()
            if isLoading {
                ProgressView("جاري تجهيز الاختبار...")
            } else if let errorMessage, quiz == nil {
                ContentUnavailableView("تعذّر فتح الاختبار", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
            } else if let result, let quiz {
                QuizResultView(quiz: quiz, result: result) { dismiss() }
            } else if let quiz, let question = currentQuestion {
                quizContent(quiz: quiz, question: question)
            } else {
                ContentUnavailableView("الاختبار فارغ", systemImage: "questionmark.folder", description: Text("لم تُضف أسئلة لهذا الاختبار بعد."))
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { await load() }
        .task(id: quiz?.id) { await runTimerIfNeeded() }
        .alert("تعذّر إكمال العملية", isPresented: Binding(
            get: { errorMessage != nil && quiz != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("حسنًا", role: .cancel) { errorMessage = nil }
        } message: { Text(errorMessage ?? "") }
    }

    private func quizContent(quiz: Quiz, question: QuizQuestion) -> some View {
        ScrollView {
            VStack(spacing: 18) {
                topBar(quiz)
                progressBar
                questionCard(question)
                answerOptions(question)
                navigationRow(quiz)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .scrollIndicators(.hidden)
    }

    private func topBar(_ quiz: Quiz) -> some View {
        HStack {
            TopCircleButton(symbol: "xmark") { dismiss() }
            Spacer()
            VStack(spacing: 2) {
                Text(quiz.title).font(QMTheme.font(.bold, size: 17)).foregroundStyle(QMTheme.ink).lineLimit(1)
                if quiz.timeLimitMinutes != nil {
                    Label(timeLabel, systemImage: "timer")
                        .font(QMTheme.font(.bold, size: 10))
                        .foregroundStyle(secondsRemaining < 60 ? QMTheme.coral : QMTheme.violet)
                }
            }
            Spacer()
            Text("\(questionIndex + 1)")
                .font(QMTheme.font(.black, size: 16))
                .foregroundStyle(QMTheme.violet)
                .frame(width: 42, height: 42)
                .qmGlass(cornerRadius: 14)
        }
    }

    private var progressBar: some View {
        VStack(alignment: .trailing, spacing: 8) {
            HStack {
                Text("\(answers.count) مجاب")
                Spacer()
                Text("السؤال \(questionIndex + 1) من \(questions.count)")
            }
            .font(QMTheme.font(.regular, size: 10))
            .foregroundStyle(QMTheme.muted)
            CapsuleProgress(progress: Double(questionIndex + 1) / Double(max(questions.count, 1)))
        }
    }

    private func questionCard(_ question: QuizQuestion) -> some View {
        VStack(alignment: .trailing, spacing: 15) {
            HStack {
                Text("\(question.marks) درجة")
                    .font(QMTheme.font(.bold, size: 10))
                    .foregroundStyle(QMTheme.magenta)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(QMTheme.magenta.opacity(0.09), in: Capsule())
                Spacer()
                Image(systemName: "function")
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(QMTheme.purpleGradient, in: RoundedRectangle(cornerRadius: 14))
            }
            Text(question.questionText)
                .font(QMTheme.font(.bold, size: 19))
                .foregroundStyle(QMTheme.ink)
                .lineSpacing(7)
                .frame(maxWidth: .infinity, alignment: .trailing)
            if let imageURL = question.questionImageURL, let url = URL(string: imageURL) {
                AsyncImage(url: url) { image in image.resizable().scaledToFit() } placeholder: { ProgressView() }
                    .frame(maxHeight: 230)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
            }
        }
        .padding(20)
        .qmGlass(cornerRadius: 26, tint: QMTheme.violet.opacity(0.035))
    }

    private func answerOptions(_ question: QuizQuestion) -> some View {
        VStack(spacing: 11) {
            ForEach(["a", "b", "c", "d"], id: \.self) { key in
                let isSelected = answers[question.id] == key
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) { answers[question.id] = key }
                } label: {
                    HStack(spacing: 13) {
                        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(isSelected ? .white : QMTheme.violet)
                        Spacer()
                        Text(question.option(for: key))
                            .font(QMTheme.font(.bold, size: 14))
                            .foregroundStyle(isSelected ? .white : QMTheme.ink)
                            .multilineTextAlignment(.trailing)
                        Text(key.uppercased())
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .foregroundStyle(isSelected ? QMTheme.violet : .white)
                            .frame(width: 34, height: 34)
                            .background(isSelected ? Color.white : QMTheme.violet, in: Circle())
                    }
                    .padding(.horizontal, 15)
                    .frame(minHeight: 58)
                    .background(isSelected ? AnyShapeStyle(QMTheme.purpleGradient) : AnyShapeStyle(.white.opacity(0.7)), in: RoundedRectangle(cornerRadius: 19))
                    .overlay(RoundedRectangle(cornerRadius: 19).stroke(isSelected ? .clear : QMTheme.violet.opacity(0.12)))
                }
                .buttonStyle(ScaleButtonStyle())
            }
        }
    }

    private func navigationRow(_ quiz: Quiz) -> some View {
        HStack(spacing: 11) {
            Button {
                withAnimation { questionIndex = max(0, questionIndex - 1) }
            } label: {
                Image(systemName: "arrow.right")
                    .foregroundStyle(QMTheme.violet)
                    .frame(width: 54, height: 54)
                    .background(QMTheme.softViolet, in: Circle())
            }
            .buttonStyle(ScaleButtonStyle())
            .disabled(questionIndex == 0)
            .opacity(questionIndex == 0 ? 0.35 : 1)

            if questionIndex == questions.count - 1 {
                Button { Task { await submit(quiz) } } label: {
                    HStack(spacing: 9) {
                        if isSubmitting { ProgressView().tint(.white) }
                        Text("إنهاء وتسليم الاختبار")
                        Image(systemName: "paperplane.fill")
                    }
                    .font(QMTheme.font(.bold, size: 14))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(QMTheme.purpleGradient, in: Capsule())
                }
                .buttonStyle(ScaleButtonStyle())
                .disabled(isSubmitting)
            } else {
                PrimaryGradientButton(title: "السؤال التالي", symbol: "arrow.left") {
                    withAnimation { questionIndex += 1 }
                }
            }
        }
    }

    private var timeLabel: String {
        String(format: "%02d:%02d", secondsRemaining / 60, secondsRemaining % 60)
    }

    private func load() async {
        isLoading = true
        do {
            async let quizRequest = session.service.fetchQuiz(id: quizID)
            async let questionRequest = session.service.fetchQuestions(quizID: quizID)
            let loadedQuiz = try await quizRequest
            quiz = loadedQuiz
            questions = try await questionRequest
            secondsRemaining = (loadedQuiz.timeLimitMinutes ?? 0) * 60
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func runTimerIfNeeded() async {
        guard quiz?.timeLimitMinutes != nil else { return }
        while secondsRemaining > 0 && result == nil {
            try? await Task.sleep(for: .seconds(1))
            guard !Task.isCancelled else { return }
            secondsRemaining -= 1
        }
        if secondsRemaining == 0, result == nil, let quiz { await submit(quiz) }
    }

    private func submit(_ quiz: Quiz) async {
        guard !isSubmitting, session.userID != nil else { return }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            result = try await session.service.submitQuiz(quizID: quiz.id, answers: answers)
            await session.refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct QuizLibraryView: View {
    @Environment(AppSession.self) private var session
    let onOpenQuiz: (UUID) -> Void

    var body: some View {
        ZStack {
            AmbientBackdrop()
            ScrollView {
                LazyVStack(alignment: .trailing, spacing: 15) {
                    Text("مركز التدريب")
                        .font(QMTheme.font(.black, size: 30))
                        .foregroundStyle(QMTheme.ink)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    Text("اختبر فهمك، اكتشف نقاطك، وارجع أقوى.")
                        .font(QMTheme.font(.regular, size: 13))
                        .foregroundStyle(QMTheme.muted)
                        .frame(maxWidth: .infinity, alignment: .trailing)

                    if session.dashboard.quizzes.isEmpty {
                        ContentUnavailableView("لا توجد اختبارات متاحة", systemImage: "target", description: Text("ستظهر اختبارات كورساتك هنا فور نشرها."))
                            .padding(.top, 70)
                    } else {
                        ForEach(session.dashboard.quizzes) { quiz in
                            Button { onOpenQuiz(quiz.id) } label: {
                                QuizLibraryCard(quiz: quiz, results: session.dashboard.results.filter { $0.quizID == quiz.id })
                            }
                            .buttonStyle(.plain)
                        }
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

private struct QuizLibraryCard: View {
    let quiz: Quiz
    let results: [QuizResult]

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "chevron.left").foregroundStyle(QMTheme.violet)
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                Text(quiz.title).font(QMTheme.font(.black, size: 18)).foregroundStyle(QMTheme.ink)
                Text("\(quiz.totalMarks) درجة • \(quiz.timeLimitMinutes.map { "\($0) دقيقة" } ?? "بدون توقيت")")
                    .font(QMTheme.font(.regular, size: 10)).foregroundStyle(QMTheme.muted)
                if let result = results.first {
                    Text("آخر نتيجة: \(result.score) من \(result.totalMarks)")
                        .font(QMTheme.font(.bold, size: 10))
                        .foregroundStyle(result.passed == true ? QMTheme.success : QMTheme.coral)
                }
            }
            Image(systemName: "target")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 58, height: 58)
                .background(QMTheme.purpleGradient, in: RoundedRectangle(cornerRadius: 19))
        }
        .padding(17)
        .qmGlass(cornerRadius: 23, interactive: true)
    }
}

private struct QuizResultView: View {
    let quiz: Quiz
    let result: QuizResult
    let done: () -> Void

    private var percentage: Int {
        Int((Double(result.score) / Double(max(result.totalMarks, 1)) * 100).rounded())
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Image(systemName: result.passed == true ? "trophy.fill" : "arrow.trianglehead.2.clockwise.rotate.90")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundStyle(result.passed == true ? QMTheme.gold : QMTheme.violet)
                    .frame(width: 112, height: 112)
                    .background(.white.opacity(0.75), in: Circle())
                    .shadow(color: QMTheme.violet.opacity(0.18), radius: 28, y: 15)
                VStack(spacing: 7) {
                    Text(result.passed == true ? "أحسنت، تفوقت!" : "خطوة جديدة نحو التفوق")
                        .font(QMTheme.font(.black, size: 28)).foregroundStyle(QMTheme.ink)
                    Text(quiz.title).font(QMTheme.font(.regular, size: 13)).foregroundStyle(QMTheme.muted)
                }
                Text("\(percentage)%")
                    .font(QMTheme.font(.black, size: 58))
                    .foregroundStyle(QMTheme.brandGradient)
                HStack(spacing: 12) {
                    resultStat(value: "\(result.score)", label: "درجتك")
                    resultStat(value: "\(result.totalMarks)", label: "الإجمالي")
                    resultStat(value: result.passed == true ? "ناجح" : "راجع", label: "التقييم")
                }
                Text(result.passed == true ? "استمر بنفس القوة؛ كل نتيجة تثبت أنك أقرب لهدفك." : "راجع ملخص الدرس ثم أعد المحاولة. الفهم أولًا، والدرجة ستأتي.")
                    .font(QMTheme.font(.regular, size: 14)).foregroundStyle(QMTheme.muted)
                    .multilineTextAlignment(.center).lineSpacing(6)
                    .padding(19).qmGlass(cornerRadius: 22)
                PrimaryGradientButton(title: "العودة للتدريب", symbol: "checkmark") { done() }
            }
            .padding(24)
            .padding(.top, 48)
        }
    }

    private func resultStat(value: String, label: String) -> some View {
        VStack(spacing: 5) {
            Text(value).font(QMTheme.font(.black, size: 18)).foregroundStyle(QMTheme.violet)
            Text(label).font(QMTheme.font(.regular, size: 9)).foregroundStyle(QMTheme.muted)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 16).qmGlass(cornerRadius: 19)
    }
}
