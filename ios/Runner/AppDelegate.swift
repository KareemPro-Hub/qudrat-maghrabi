import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  // أبل ما بتتيحش منع تسجيل الشاشة، فأقصى المتاح إننا نكشفه ونغطّي المحتوى
  // فورًا لحد ما التسجيل يقف. الغطاء بيتحط فوق النافذة نفسها عشان يشمل كل
  // الشاشات من غير أي تعديل في كود Flutter.
  private var captureOverlay: UIView?

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

  private func showCaptureOverlay() {
    guard captureOverlay == nil, let window = self.window else { return }

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
