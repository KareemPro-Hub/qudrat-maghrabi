import 'package:flutter/material.dart';

abstract final class QmColors {
  static const Color coral = Color(0xFFFF9A72);
  static const Color pink = Color(0xFFFF4F8B);
  static const Color purple = Color(0xFF7A2DD6);
  static const Color deepPurple = Color(0xFF32134F);

  static bool useDarkPalette = false;

  static Color get background =>
      useDarkPalette ? const Color(0xFF100B18) : const Color(0xFFF9F7FF);
  static Color get surface =>
      useDarkPalette ? const Color(0xFF1B1426) : const Color(0xFFFFFFFF);
  static Color get surfaceSoft =>
      useDarkPalette ? const Color(0xFF241B31) : const Color(0xFFFCFAFF);
  static Color get lavender =>
      useDarkPalette ? const Color(0xFF302143) : const Color(0xFFF1EAFE);
  static Color get border =>
      useDarkPalette ? const Color(0xFF463653) : const Color(0xFFE8E0F1);

  static Color get textPrimary =>
      useDarkPalette ? const Color(0xFFF8F2FF) : const Color(0xFF211038);
  static Color get textSecondary =>
      useDarkPalette ? const Color(0xFFC9BED4) : const Color(0xFF81778E);
  static Color get textMuted =>
      useDarkPalette ? const Color(0xFF9B8EA8) : const Color(0xFFA69EAF);

  static const Color gold = Color(0xFFFFC84D);
  static const Color success = Color(0xFF18A66A);
  static const Color error = Color(0xFFFF4D57);
}
