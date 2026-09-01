package com.qudratmaghrabi.app

import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterFragmentActivity

// local_auth بيحتاج FragmentActivity عشان يعرض حوار البصمة على أندرويد.
class MainActivity : FlutterFragmentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // FLAG_SECURE بيمنع تصوير الشاشة وتسجيلها لكل شاشات التطبيق، وده اللي
    // بيحمي دروس الفيديو والاختبارات من التسريب على أندرويد.
    window.setFlags(
      WindowManager.LayoutParams.FLAG_SECURE,
      WindowManager.LayoutParams.FLAG_SECURE,
    )
    super.onCreate(savedInstanceState)
  }
}
