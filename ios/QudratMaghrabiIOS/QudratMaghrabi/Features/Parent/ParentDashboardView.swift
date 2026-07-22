import SwiftUI

struct ParentDashboardView: View {
    @Environment(AppSession.self) private var session
    @State private var students: [ParentStudentSummary] = []
    @State private var selectedStudentID: UUID?
    @State private var isLoading = true
    @State private var errorMessage: String?

    private var selected: ParentStudentSummary? {
        students.first { $0.id == selectedStudentID } ?? students.first
    }

    var body: some View {
        ZStack {
            AmbientBackdrop()
            if isLoading {
                ProgressView("جاري تجهيز متابعة الأبناء...")
            } else if let errorMessage {
                ContentUnavailableView(
                    "تعذّر تحميل البيانات",
                    systemImage: "wifi.exclamationmark",
                    description: Text(errorMessage)
                )
            } else if let selected {
                content(selected)
            } else {
                emptyState
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func content(_ student: ParentStudentSummary) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                topBar

                if students.count > 1 {
                    Picker("الطالب", selection: Binding(
                        get: { selectedStudentID ?? student.id },
                        set: { selectedStudentID = $0 }
                    )) {
                        ForEach(students) { item in
                            Text(item.profile.fullName).tag(item.id)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                parentHero(student)
                stats(student)

                VStack(alignment: .trailing, spacing: 12) {
                    SectionTitle(title: "الكورسات الحالية", subtitle: "تقدّم واضح بدون أرقام معقدة")
                    ForEach(student.courses) { item in
                        VStack(alignment: .trailing, spacing: 10) {
                            HStack {
                                Text("\(item.completionPercentage)%")
                                    .font(QMTheme.font(.black, size: 18))
                                    .foregroundStyle(QMTheme.violet)
                                Spacer()
                                Text(item.course.title)
                                    .font(QMTheme.font(.bold, size: 15))
                                    .foregroundStyle(QMTheme.ink)
                            }
                            CapsuleProgress(progress: Double(item.completionPercentage) / 100)
                            Text("أكمل \(item.completedCount) من \(item.lessons.count) درسًا")
                                .font(QMTheme.font(.regular, size: 11))
                                .foregroundStyle(QMTheme.muted)
                        }
                        .padding(17)
                        .qmGlass(cornerRadius: 22)
                    }
                }
            }
            .padding(20)
            .padding(.bottom, 28)
        }
        .scrollIndicators(.hidden)
    }

    private var topBar: some View {
        HStack {
            Button {
                Task { await session.signOut() }
            } label: {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .frame(width: 44, height: 44)
                    .qmGlass(cornerRadius: 15, interactive: true)
            }
            .buttonStyle(.plain)

            Spacer()
            Image("BrandLogo")
                .resizable()
                .scaledToFit()
                .padding(6)
                .frame(width: 52, height: 52)
                .qmGlass(cornerRadius: 17)
        }
    }

    private func parentHero(_ student: ParentStudentSummary) -> some View {
        VStack(alignment: .trailing, spacing: 16) {
            Text("أهلًا \(session.profile?.firstName ?? "") 👋")
                .font(QMTheme.font(.regular, size: 13))
                .foregroundStyle(.white.opacity(0.74))
            Text("\(student.profile.firstName) يتقدم بثبات")
                .font(QMTheme.font(.black, size: 28))
                .foregroundStyle(.white)
            Text("تابع إنجازه وادعمه في الخطوة القادمة")
                .font(QMTheme.font(.regular, size: 13))
                .foregroundStyle(.white.opacity(0.78))
        }
        .padding(24)
        .frame(maxWidth: .infinity, minHeight: 190, alignment: .trailing)
        .background(QMTheme.brandGradient, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
        .shadow(color: QMTheme.violet.opacity(0.28), radius: 26, y: 15)
    }

    private func stats(_ student: ParentStudentSummary) -> some View {
        HStack(spacing: 10) {
            parentStat(value: "\(student.averageScore)%", label: "متوسط الاختبارات", symbol: "chart.line.uptrend.xyaxis")
            parentStat(value: "\(student.courses.count)", label: "كورسات فعالة", symbol: "books.vertical.fill")
        }
    }

    private func parentStat(value: String, label: String, symbol: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: symbol).foregroundStyle(QMTheme.violet)
            Text(value).font(QMTheme.font(.black, size: 22)).foregroundStyle(QMTheme.ink)
            Text(label).font(QMTheme.font(.regular, size: 10)).foregroundStyle(QMTheme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .qmGlass(cornerRadius: 22)
    }

    private var emptyState: some View {
        VStack(spacing: 18) {
            Image(systemName: "figure.2.and.child.holdinghands")
                .font(.system(size: 44, weight: .medium))
                .foregroundStyle(QMTheme.violet)
            Text("لم يُربط حساب طالب بعد")
                .font(QMTheme.font(.black, size: 22))
                .foregroundStyle(QMTheme.ink)
            Text("اربط حساب الطالب من المنصة على الويب، ثم اسحب للتحديث هنا.")
                .font(QMTheme.font(.regular, size: 13))
                .foregroundStyle(QMTheme.muted)
                .multilineTextAlignment(.center)
        }
        .padding(26)
    }

    private func load() async {
        guard let id = session.userID else { return }
        isLoading = true
        errorMessage = nil
        do {
            students = try await session.service.fetchParentStudents(parentID: id)
            if selectedStudentID == nil { selectedStudentID = students.first?.id }
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
