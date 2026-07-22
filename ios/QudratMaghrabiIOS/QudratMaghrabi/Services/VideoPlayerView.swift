import SwiftUI
import WebKit

struct SecureVideoPlayerView: View {
    let lesson: Lesson
    let onComplete: () -> Void

    @Environment(AppSession.self) private var session
    @State private var playerURL: URL?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color.black)

            if let playerURL {
                BunnyWebPlayer(url: playerURL)
                    .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
            } else if isLoading {
                VStack(spacing: 12) {
                    ProgressView().tint(.white)
                    Text("جاري تجهيز الفيديو الآمن...")
                        .font(QMTheme.font(.regular, size: 12))
                        .foregroundStyle(.white.opacity(0.78))
                }
            } else {
                ContentUnavailableView(
                    "تعذّر تشغيل الفيديو",
                    systemImage: "play.slash.fill",
                    description: Text(errorMessage ?? "حاول مرة أخرى.")
                )
                .foregroundStyle(.white)
            }
        }
        .aspectRatio(16 / 9, contentMode: .fit)
        .overlay(alignment: .bottomTrailing) {
            if playerURL != nil {
                Button(action: onComplete) {
                    Label("أتممت الدرس", systemImage: "checkmark.seal.fill")
                        .font(QMTheme.font(.bold, size: 11))
                        .foregroundStyle(QMTheme.ink)
                        .padding(.horizontal, 13)
                        .frame(height: 38)
                        .background(QMTheme.gold, in: Capsule())
                }
                .buttonStyle(ScaleButtonStyle())
                .padding(12)
            }
        }
        .task(id: lesson.id) {
            await load()
        }
    }

    private func load() async {
        guard let videoID = lesson.videoID, !videoID.isEmpty else {
            isLoading = false
            errorMessage = "لم يُضف فيديو لهذا الدرس بعد."
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            playerURL = try await session.service.signedVideoURL(videoID: videoID, courseID: lesson.courseID)
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

private struct BunnyWebPlayer: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.allowsBackForwardNavigationGestures = false
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard webView.url != url else { return }
        webView.load(URLRequest(url: url))
    }
}
