import Foundation
import Observation
import Supabase

@MainActor
@Observable
final class AppSession {
    enum Phase: Equatable {
        case booting
        case signedOut
        case authenticated
        case failed(String)
    }

    let client: SupabaseClient
    let service: PlatformService

    private(set) var phase: Phase = .booting
    private(set) var profile: Profile?
    var dashboard: StudentDashboardData = .empty
    var isRefreshing = false
    var presentedMessage: String?

    init(configuration: AppConfiguration = .live) {
        let client = SupabaseClient(
            supabaseURL: configuration.supabaseURL,
            supabaseKey: configuration.supabasePublishableKey
        )
        self.client = client
        self.service = PlatformService(client: client, configuration: configuration)
    }

    var userID: UUID? { profile?.id }
    var isAuthenticated: Bool { phase == .authenticated }

    func bootstrap() async {
        phase = .booting
        do {
            let session = try await client.auth.session
            try await activate(userID: session.user.id)
        } catch {
            profile = nil
            dashboard = .empty
            phase = .signedOut
        }
    }

    func signIn(email: String, password: String) async throws {
        let response = try await client.auth.signIn(
            email: email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            password: password
        )
        try await activate(userID: response.user.id)
    }

    @discardableResult
    func signUp(
        fullName: String,
        email: String,
        phone: String,
        password: String,
        role: UserRole
    ) async throws -> Bool {
        let response = try await client.auth.signUp(
            email: email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            password: password,
            data: [
                "full_name": .string(fullName.trimmingCharacters(in: .whitespacesAndNewlines)),
                "phone": .string(phone.trimmingCharacters(in: .whitespacesAndNewlines)),
                "role": .string(role.rawValue)
            ],
            redirectTo: URL(string: "https://www.qudratmaghrabi.com/login")
        )

        if let session = response.session {
            try await activate(userID: session.user.id)
            return false
        }
        return true
    }

    func sendPasswordReset(email: String) async throws {
        try await client.auth.resetPasswordForEmail(
            email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            redirectTo: URL(string: "https://www.qudratmaghrabi.com/reset-password")
        )
    }

    func handle(url: URL) async {
        do {
            let session = try await client.auth.session(from: url)
            try await activate(userID: session.user.id)
        } catch {
            presentedMessage = "تعذّر إكمال عملية تسجيل الدخول من الرابط."
        }
    }

    func refresh() async {
        guard let profile else { return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            self.profile = try await service.fetchProfile(userID: profile.id)
            if profile.role == .student {
                dashboard = try await service.fetchStudentDashboard(studentID: profile.id)
            }
        } catch is CancellationError {
            return
        } catch {
            presentedMessage = error.localizedDescription
        }
    }

    func updateProfile(fullName: String, phone: String?) async throws {
        guard let id = profile?.id else { return }
        profile = try await service.updateProfile(userID: id, fullName: fullName, phone: phone)
    }

    func signOut() async {
        try? await client.auth.signOut()
        profile = nil
        dashboard = .empty
        phase = .signedOut
    }

    func deleteAccount() async throws {
        try await service.deleteCurrentAccount()
        try? await client.auth.signOut()
        profile = nil
        dashboard = .empty
        phase = .signedOut
    }

    private func activate(userID: UUID) async throws {
        let loadedProfile = try await service.fetchProfile(userID: userID)
        profile = loadedProfile
        phase = .authenticated

        if loadedProfile.role == .student {
            dashboard = try await service.fetchStudentDashboard(studentID: userID)
        } else {
            dashboard = .empty
        }
    }
}
