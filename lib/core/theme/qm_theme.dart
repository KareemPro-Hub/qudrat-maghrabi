import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';

abstract final class QmTheme {
  static ThemeData get light => _build(Brightness.light);
  static ThemeData get dark => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final colorScheme = ColorScheme.fromSeed(
      seedColor: QmColors.purple,
      brightness: brightness,
      primary: QmColors.purple,
      secondary: QmColors.pink,
      surface: isDark ? const Color(0xFF1B1426) : const Color(0xFFFFFFFF),
      error: QmColors.error,
    );

    final baseTheme = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      fontFamily: 'FrutigerArabic',
      scaffoldBackgroundColor: isDark
          ? const Color(0xFF100B18)
          : const Color(0xFFF9F7FF),
    );

    return baseTheme.copyWith(
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        systemOverlayStyle: isDark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
      ),
      textTheme: baseTheme.textTheme.apply(
        bodyColor: isDark ? const Color(0xFFF8F2FF) : const Color(0xFF211038),
        displayColor: isDark
            ? const Color(0xFFF8F2FF)
            : const Color(0xFF211038),
        fontFamily: 'FrutigerArabic',
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF241B31) : const Color(0xFFFCFAFF),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 18,
        ),
        hintStyle: TextStyle(
          color: isDark ? Color(0xFF9B8EA8) : Color(0xFFA69EAF),
          fontWeight: FontWeight.w400,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(
            color: isDark ? const Color(0xFF463653) : const Color(0xFFE8E0F1),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: QmColors.pink, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: QmColors.error),
        ),
      ),
      cardTheme: CardThemeData(
        color: isDark ? const Color(0xFF1B1426) : const Color(0xFFFFFFFF),
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(
            color: isDark ? const Color(0xFF463653) : const Color(0xFFE8E0F1),
          ),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: isDark ? const Color(0xFF463653) : const Color(0xFFE8E0F1),
        thickness: 1,
        space: 1,
      ),
    );
  }
}
