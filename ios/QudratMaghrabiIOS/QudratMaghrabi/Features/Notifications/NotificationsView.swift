import SwiftUI

struct NotificationsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSession.self) private var session
    @State private var notifications: [PlatformNotification] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackdrop()
                Group {
                    if isLoading {
                        ProgressView("جاري تحميل الإشعارات...")
                    } else if let errorMessage {
                        ContentUnavailableView(
                            "تعذّر تحميل الإشعارات",
                            systemImage: "wifi.exclamationmark",
                            description: Text(errorMessage)
                        )
                    } else if notifications.isEmpty {
                        ContentUnavailableView(
                            "لا توجد إشعارات",
                            systemImage: "bell.slash.fill",
                            description: Text("سنخبرك هنا بكل جديد في رحلتك.")
                        )
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(notifications) { item in
                                    NotificationCard(notification: item)
                                }
                            }
                            .padding(20)
                        }
                    }
                }
            }
            .navigationTitle("الإشعارات")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إغلاق") { dismiss() }
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        guard let id = session.userID else { return }
        do {
            notifications = try await session.service.fetchNotifications(userID: id)
            try? await session.service.markNotificationsRead(userID: id)
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

private struct NotificationCard: View {
    let notification: PlatformNotification

    private var tint: Color {
        switch notification.type {
        case "success": QMTheme.success
        case "warning": QMTheme.gold
        case "payment", "enrollment": QMTheme.magenta
        default: QMTheme.violet
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 13) {
            VStack(alignment: .trailing, spacing: 6) {
                HStack {
                    if notification.isRead == false {
                        Circle().fill(tint).frame(width: 8, height: 8)
                    }
                    Spacer()
                    Text(notification.title)
                        .font(QMTheme.font(.bold, size: 15))
                        .foregroundStyle(QMTheme.ink)
                }
                Text(notification.body)
                    .font(QMTheme.font(.regular, size: 12))
                    .foregroundStyle(QMTheme.muted)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }

            Image(systemName: notification.type == "success" ? "checkmark.seal.fill" : "bell.fill")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 44, height: 44)
                .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
        }
        .padding(16)
        .qmGlass(cornerRadius: 22, tint: tint.opacity(0.03))
    }
}
