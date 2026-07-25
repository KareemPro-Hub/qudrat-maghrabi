import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';

abstract final class QmTheme {
  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: QmColors.purple,
      brightness: Brightness.light,
      primary: QmColors.purple,
      secondary: QmColors.pink,
      surface: QmColors.surface,
      error: QmColors.error,
    );

    final baseTheme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      fontFamily: 'FrutigerArabic',
      scaffoldBackgroundColor: QmColors.background,
    );

    return baseTheme.copyWith(
      textTheme: baseTheme.textTheme.apply(
        bodyColor: QmColors.textPrimary,
        displayColor: QmColors.textPrimary,
        fontFamily: 'FrutigerArabic',
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: QmColors.surfaceSoft,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 18,
        ),
        hintStyle: const TextStyle(
          color: QmColors.textMuted,
          fontWeight: FontWeight.w400,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: QmColors.border),
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
        color: QmColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: QmColors.border),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: QmColors.border,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
