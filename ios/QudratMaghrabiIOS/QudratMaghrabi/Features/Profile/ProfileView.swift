import SwiftUI

struct ProfileView: View {
    @Environment(AppSession.self) private var session
    @State private var sheet: ProfileSheet?
    @State private var confirmsSignOut = false
    @State private var confirmsDeletion = false
    @State private var isDeleting = false
    @State private var errorMessage: String?

    private var completion: Int {
        let courses = session.dashboard.courses
        guard !courses.isEmpty else { return 0 }
        return Int((Double(courses.reduce(0) { $0 + $1.completionPercentage }) / Double(courses.count)).rounded())
    }

    private var latestScore: Int {
        guard let result = session.dashboard.results.first else { return 0 }
        return Int((Double(result.score) / Double(max(result.totalMarks, 1)) * 100).rounded())
    }

    var body: some View {
        ZStack {
            AmbientBackdrop()
            ScrollView {
                VStack(spacing: 20) {
                    profileHeader
                    stats

                    VStack(alignment: .leading, spacing: 12) {
                        SectionTitle(title: "حسابك", subtitle: "بياناتك وإعدادات رحلتك")
                        ProfileActionRow(title: "تعديل البيانات", subtitle: "الاسم ورقم الجوال", symbol: "person.crop.circle.badge.pencil") {
                            sheet = .edit
                        }
                        ProfileActionRow(title: "الإشعارات", subtitle: "كل جديد في المنصة", symbol: "bell.badge.fill") {
                            sheet = .notifications
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        SectionTitle(title: "المساعدة والخصوصية", subtitle: "كل شيء واضح وتحت سيطرتك")
                        ProfileLinkRow(title: "الدعم والمساعدة", subtitle: "تواصل معنا مباشرة", symbol: "headphones", url: URL(string: "mailto:support@qudratmaghrabi.com")!)
                        ProfileLinkRow(title: "سياسة الخصوصية", subtitle: "كيف نحمي بياناتك", symbol: "hand.raised.fill", url: URL(string: "https://www.qudratmaghrabi.com/privacy")!)
                        ProfileLinkRow(title: "الشروط والأحكام", subtitle: "حقوقك والتزامات الاستخدام", symbol: "doc.text.fill", url: URL(string: "https://www.qudratmaghrabi.com/terms")!)
                    }

                    VStack(spacing: 10) {
                        Button { confirmsSignOut = true } label: {
                            Label("تسجيل الخروج", systemImage: "rectangle.portrait.and.arrow.right")
                                .font(QMTheme.font(.bold, size: 14))
                                .foregroundStyle(QMTheme.violet)
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(QMTheme.softViolet, in: Capsule())
                        }
                        .buttonStyle(ScaleButtonStyle())

                        Button(role: .destructive) { confirmsDeletion = true } label: {
                            Label("حذف الحساب نهائيًا", systemImage: "trash.fill")
                                .font(QMTheme.font(.bold, size: 12))
                        }
                        .disabled(isDeleting)
                    }
                }
                .padding(20)
                .padding(.bottom, 120)
            }
            .scrollIndicators(.hidden)
            .refreshable { await session.refresh() }
        }
        .sheet(item: $sheet) { item in
            switch item {
            case .edit: ProfileEditView()
            case .notifications: NotificationsView()
            }
        }
        .confirmationDialog("هل تريد تسجيل الخروج؟", isPresented: $confirmsSignOut, titleVisibility: .visible) {
            Button("تسجيل الخروج", role: .destructive) { Task { await session.signOut() } }
            Button("إلغاء", role: .cancel) {}
        }
        .confirmationDialog("حذف الحساب نهائيًا؟", isPresented: $confirmsDeletion, titleVisibility: .visible) {
            Button("حذف الحساب وكل بياناته", role: .destructive) { Task { await deleteAccount() } }
            Button("إلغاء", role: .cancel) {}
        } message: {
            Text("لا يمكن التراجع عن هذا الإجراء. ستُحذف بيانات الحساب المرتبطة بك من المنصة.")
        }
        .alert("تعذّر تنفيذ العملية", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("حسنًا", role: .cancel) { errorMessage = nil }
        } message: { Text(errorMessage ?? "") }
    }

    private var profileHeader: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle().fill(QMTheme.brandGradient).frame(width: 96, height: 96)
                Text(session.profile?.initial ?? "ط")
                    .font(QMTheme.font(.black, size: 36))
                    .foregroundStyle(.white)
            }
            .overlay(Circle().stroke(.white.opacity(0.8), lineWidth: 4))
            .shadow(color: QMTheme.violet.opacity(0.28), radius: 24, y: 12)

            Text(session.profile?.fullName ?? "حسابي")
                .font(QMTheme.font(.black, size: 25))
                .foregroundStyle(QMTheme.ink)
            Text("\(session.profile?.role.arabicTitle ?? "طالب") • افهم وتفوّق 🔥")
                .font(QMTheme.font(.regular, size: 12))
                .foregroundStyle(QMTheme.muted)
            Text(session.profile?.email ?? "")
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(QMTheme.violet)
        }
        .padding(.top, 18)
    }

    private var stats: some View {
        QMGlassGroup(spacing: 10) {
            HStack(spacing: 10) {
                profileStat(value: "\(session.dashboard.courses.count)", label: "كورس", symbol: "books.vertical.fill")
                profileStat(value: "\(completion)%", label: "الإنجاز", symbol: "target")
                profileStat(value: "\(latestScore)%", label: "آخر نتيجة", symbol: "chart.line.uptrend.xyaxis")
            }
        }
    }

    private func profileStat(value: String, label: String, symbol: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: symbol).foregroundStyle(QMTheme.violet)
            Text(value).font(QMTheme.font(.black, size: 19)).foregroundStyle(QMTheme.ink)
            Text(label).font(QMTheme.font(.regular, size: 9)).foregroundStyle(QMTheme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .qmGlass(cornerRadius: 20)
    }

    private func deleteAccount() async {
        isDeleting = true
        defer { isDeleting = false }
        do { try await session.deleteAccount() }
        catch { errorMessage = error.localizedDescription }
    }
}

private enum ProfileSheet: String, Identifiable {
    case edit, notifications
    var id: String { rawValue }
}

private struct ProfileActionRow: View {
    let title: String
    let subtitle: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ProfileRowLabel(title: title, subtitle: subtitle, symbol: symbol)
        }
        .buttonStyle(.plain)
    }
}

private struct ProfileLinkRow: View {
    let title: String
    let subtitle: String
    let symbol: String
    let url: URL
    var body: some View {
        Link(destination: url) { ProfileRowLabel(title: title, subtitle: subtitle, symbol: symbol) }
    }
}

private struct ProfileRowLabel: View {
    let title: String
    let subtitle: String
    let symbol: String
    var body: some View {
        HStack(spacing: 13) {
            Image(systemName: "chevron.left").font(.system(size: 11, weight: .bold)).foregroundStyle(QMTheme.muted)
            Spacer()
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(QMTheme.font(.bold, size: 14)).foregroundStyle(QMTheme.ink)
                Text(subtitle).font(QMTheme.font(.regular, size: 9)).foregroundStyle(QMTheme.muted)
            }
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(QMTheme.violet)
                .frame(width: 43, height: 43)
                .background(QMTheme.softViolet, in: RoundedRectangle(cornerRadius: 14))
        }
        .padding(13)
        .qmGlass(cornerRadius: 21, interactive: true)
    }
}

private struct ProfileEditView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSession.self) private var session
    @State private var fullName = ""
    @State private var phone = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackdrop()
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        Text("حدّث بياناتك لتظل تجربتك دقيقة وسلسة.")
                            .font(QMTheme.font(.regular, size: 13)).foregroundStyle(QMTheme.muted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        editField(title: "الاسم الكامل", text: $fullName, symbol: "person.fill")
                        editField(title: "رقم الجوال", text: $phone, symbol: "phone.fill")
                            .keyboardType(.phonePad)
                        PrimaryGradientButton(title: isSaving ? "جاري الحفظ..." : "حفظ التعديلات", symbol: "checkmark") {
                            Task { await save() }
                        }
                        .disabled(isSaving || fullName.trimmingCharacters(in: .whitespacesAndNewlines).count < 2)
                    }
                    .padding(20)
                }
            }
            .navigationTitle("تعديل البيانات")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("إغلاق") { dismiss() } } }
        }
        .onAppear {
            fullName = session.profile?.fullName ?? ""
            phone = session.profile?.phone ?? ""
        }
        .alert("تعذّر الحفظ", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) { Button("حسنًا", role: .cancel) {} } message: { Text(errorMessage ?? "") }
    }

    private func editField(title: String, text: Binding<String>, symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(QMTheme.font(.bold, size: 12)).foregroundStyle(QMTheme.ink)
            HStack {
                TextField(title, text: text).multilineTextAlignment(.leading)
                Image(systemName: symbol).foregroundStyle(QMTheme.violet)
            }
            .padding(.horizontal, 16).frame(height: 54).qmGlass(cornerRadius: 18)
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        do {
            try await session.updateProfile(fullName: fullName, phone: phone.isEmpty ? nil : phone)
            dismiss()
        } catch { errorMessage = error.localizedDescription }
    }
}
