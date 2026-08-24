import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum QmThemePreference { system, light, dark }

extension QmThemePreferenceLabel on QmThemePreference {
  String get label => switch (this) {
    QmThemePreference.system => 'حسب إعداد الهاتف',
    QmThemePreference.light => 'الوضع الفاتح',
    QmThemePreference.dark => 'الوضع الداكن',
  };

  ThemeMode get themeMode => switch (this) {
    QmThemePreference.system => ThemeMode.system,
    QmThemePreference.light => ThemeMode.light,
    QmThemePreference.dark => ThemeMode.dark,
  };
}

class QmThemeModeController extends ChangeNotifier {
  static const _storageKey = 'theme_preference';

  QmThemePreference _preference = QmThemePreference.system;

  QmThemePreference get preference => _preference;
  ThemeMode get themeMode => _preference.themeMode;

  Future<void> load() async {
    final preferences = await SharedPreferences.getInstance();
    final stored = preferences.getString(_storageKey);
    _preference = QmThemePreference.values.firstWhere(
      (value) => value.name == stored,
      orElse: () => QmThemePreference.system,
    );
    notifyListeners();
  }

  Future<void> update(QmThemePreference preference) async {
    if (_preference == preference) return;
    _preference = preference;
    notifyListeners();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_storageKey, preference.name);
  }
}

class QmThemeModeScope extends InheritedNotifier<QmThemeModeController> {
  const QmThemeModeScope({
    required QmThemeModeController controller,
    required super.child,
    super.key,
  }) : super(notifier: controller);

  static QmThemeModeController of(BuildContext context) {
    final scope = context
        .dependOnInheritedWidgetOfExactType<QmThemeModeScope>();
    assert(scope != null, 'QmThemeModeScope is missing above this context.');
    return scope!.notifier!;
  }
}
