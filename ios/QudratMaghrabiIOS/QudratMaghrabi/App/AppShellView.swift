import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case home
    case lessons
    case practice
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "الرئيسية"
        case .lessons: "الدروس"
        case .practice: "التدريب"
        case .profile: "حسابي"
        }
    }

    var symbol: String {
        switch self {
        case .home: "house.fill"
        case .lessons: "square.grid.2x2.fill"
        case .practice: "target"
        case .profile: "person.fill"
        }
    }
}

enum AppRoute: Hashable {
    case course(UUID)
    case quiz(UUID)
}

struct AppShellView: View {
    @Environment(AppSession.self) private var session
    @State private var selectedTab: AppTab = .home
    @State private var path: [AppRoute] = []
    @State private var showsNotifications = false

    var body: some View {
        Group {
            switch session.profile?.role {
            case .parent:
                ParentDashboardView()
            case .some(let role) where role.isStaff:
                StaffHandoffView()
            default:
                studentShell
            }
        }
        .sheet(isPresented: $showsNotifications) {
            NotificationsView()
        }
    }

    private var studentShell: some View {
        NavigationStack(path: $path) {
            ZStack(alignment: .bottom) {
                tabContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                BottomNavigation(selectedTab: $selectedTab) {
                    path.removeAll()
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 8)
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: AppRoute.self) { route in
                switch route {
                case .course(let courseID):
                    LessonView(courseID: courseID) { quizID in
                        path.append(.quiz(quizID))
                    }
                case .quiz(let quizID):
                    PracticeView(quizID: quizID)
                }
            }
        }
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .home:
            HomeView(
                onOpenCourse: { path.append(.course($0)) },
                onOpenQuiz: { path.append(.quiz($0)) },
                onOpenNotifications: { showsNotifications = true }
            )
        case .lessons:
            LessonLibraryView { path.append(.course($0)) }
        case .practice:
            QuizLibraryView { path.append(.quiz($0)) }
        case .profile:
            ProfileView()
        }
    }
}

private struct StaffHandoffView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        ZStack {
            AmbientBackdrop()
            VStack(spacing: 18) {
                Image(systemName: "rectangle.3.group.bubble.fill")
                    .font(.system(size: 42))
                    .foregroundStyle(QMTheme.violet)
                Text("لوحة الإدارة على الويب")
                    .font(QMTheme.font(.black, size: 25))
                    .foregroundStyle(QMTheme.ink)
                Text("حسابك \(session.profile?.role.arabicTitle ?? "")، ويمكنك إدارة المنصة كاملة من qudratmaghrabi.com.")
                    .font(QMTheme.font(.regular, size: 13))
                    .foregroundStyle(QMTheme.muted)
                    .multilineTextAlignment(.center)
                Link(destination: URL(string: "https://www.qudratmaghrabi.com/admin")!) {
                    Label("فتح لوحة الإدارة", systemImage: "safari.fill")
                        .font(QMTheme.font(.bold, size: 15))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(QMTheme.purpleGradient, in: Capsule())
                }
                Button("تسجيل الخروج", role: .destructive) {
                    Task { await session.signOut() }
                }
            }
            .padding(25)
            .frame(maxWidth: 430)
        }
    }
}

private struct BottomNavigation: View {
    @Binding var selectedTab: AppTab
    let onChange: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            ForEach(AppTab.allCases) { tab in
                Button {
                    withAnimation(.spring(response: 0.38, dampingFraction: 0.78)) {
                        selectedTab = tab
                        onChange()
                    }
                } label: {
                    VStack(spacing: 5) {
                        Image(systemName: tab.symbol)
                            .font(.system(size: 18, weight: .semibold))
                            .frame(width: 40, height: 27)

                        Text(tab.title)
                            .font(QMTheme.font(.bold, size: 10))
                    }
                    .foregroundStyle(selectedTab == tab ? QMTheme.violet : QMTheme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background {
                        if selectedTab == tab {
                            Capsule()
                                .fill(QMTheme.violet.opacity(0.09))
                                .matchedGeometryEffect(id: "activeTab", in: tabNamespace)
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
            }
        }
        .padding(6)
        .qmGlass(cornerRadius: 26, tint: .white.opacity(0.08))
    }

    @Namespace private var tabNamespace
}

#Preview {
    AppShellView()
        .environment(AppSession())
        .environment(\.layoutDirection, .rightToLeft)
}
