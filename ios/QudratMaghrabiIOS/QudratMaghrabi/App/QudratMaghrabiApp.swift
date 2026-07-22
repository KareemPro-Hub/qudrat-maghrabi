import SwiftUI

@main
struct QudratMaghrabiApp: App {
    @State private var session = AppSession()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(\.layoutDirection, .rightToLeft)
                .tint(QMTheme.violet)
                .task {
                    if session.phase == .booting {
                        await session.bootstrap()
                    }
                }
                .onOpenURL { url in
                    Task { await session.handle(url: url) }
                }
        }
    }
}

private struct RootView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        ZStack {
            switch session.phase {
            case .booting:
                LaunchLoadingView()
            case .signedOut:
                AuthView()
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
            case .authenticated:
                AppShellView()
                    .transition(.opacity)
            case .failed(let message):
                ContentUnavailableView(
                    "تعذّر تشغيل التطبيق",
                    systemImage: "wifi.exclamationmark",
                    description: Text(message)
                )
            }
        }
        .animation(.easeInOut(duration: 0.28), value: session.phase)
        .alert(
            "قدرات المغربي",
            isPresented: Binding(
                get: { session.presentedMessage != nil },
                set: { if !$0 { session.presentedMessage = nil } }
            )
        ) {
            Button("حسنًا", role: .cancel) { session.presentedMessage = nil }
        } message: {
            Text(session.presentedMessage ?? "")
        }
    }
}

private struct LaunchLoadingView: View {
    var body: some View {
        ZStack {
            AmbientBackdrop()
            VStack(spacing: 20) {
                Image("BrandLogo")
                    .resizable()
                    .scaledToFit()
                    .padding(18)
                    .frame(width: 132, height: 132)
                    .qmGlass(cornerRadius: 36, tint: .white.opacity(0.18))

                ProgressView()
                    .tint(QMTheme.violet)

                Text("نجهّز رحلتك نحو الـ 95+")
                    .font(QMTheme.font(.bold, size: 15))
                    .foregroundStyle(QMTheme.muted)
            }
        }
    }
}
