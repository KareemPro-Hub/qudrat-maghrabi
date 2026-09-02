import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  // أبل ما بتتيحش منع تسجيل الشاشة، فأقصى المتاح إننا نكشفه ونغطّي المحتوى
  // فورًا لحد ما التسجيل يقف. الغطاء بيتحط فوق النافذة نفسها عشان يشمل كل
  // الشاشات من غير أي تعديل في كود Flutter.
  private var captureOverlay: UIView?
  private var overlayRetries = 0

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleScreenCaptureChange),
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    handleScreenCaptureChange()
    return result
  }

  @objc private func handleScreenCaptureChange() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      if UIScreen.main.isCaptured {
        self.showCaptureOverlay()
      } else {
        self.hideCaptureOverlay()
      }
    }
  }

  /// في دورة حياة UIScene (اللي التطبيق بيستخدمها — شوف SceneDelegate.swift و
  /// UIApplicationSceneManifest في Info.plist) بترجع `self.window` **nil** لأن
  /// النافذة بتخص الـ SceneDelegate مش الـ AppDelegate. ده كان بيخلّي الغطاء
  /// ما يظهرش خالص، فكشف تسجيل الشاشة على iOS كان بلا أي أثر.
  private func activeWindow() -> UIWindow? {
    if let window = self.window { return window }
    let windowScenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
    if let key = windowScenes
      .first(where: { $0.activationState == .foregroundActive })?
      .windows.first(where: { $0.isKeyWindow }) {
      return key
    }
    return windowScenes.flatMap { $0.windows }.first
  }

  private func showCaptureOverlay() {
    guard captureOverlay == nil else { return }
    guard let window = activeWindow() else {
      // النافذة لسه ما اتجهّزتش (بيحصل لو التسجيل شغّال وقت الإقلاع) — نعيد
      // المحاولة بعد لحظة بدل ما نسيب الشاشة مكشوفة، بحد أقصى 10 محاولات.
      guard overlayRetries < 10 else { return }
      overlayRetries += 1
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
        self?.handleScreenCaptureChange()
      }
      return
    }
    overlayRetries = 0

    let overlay = UIView(frame: window.bounds)
    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    overlay.backgroundColor = UIColor.black

    let label = UILabel()
    label.text = "تسجيل الشاشة غير مسموح داخل التطبيق"
    label.textColor = UIColor.white
    label.textAlignment = .center
    label.numberOfLines = 0
    label.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
    label.translatesAutoresizingMaskIntoConstraints = false
    overlay.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
      label.leadingAnchor.constraint(greaterThanOrEqualTo: overlay.leadingAnchor, constant: 24),
      label.trailingAnchor.constraint(lessThanOrEqualTo: overlay.trailingAnchor, constant: -24),
    ])

    window.addSubview(overlay)
    window.bringSubviewToFront(overlay)
    captureOverlay = overlay
  }

  private func hideCaptureOverlay() {
    captureOverlay?.removeFromSuperview()
    captureOverlay = nil
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
