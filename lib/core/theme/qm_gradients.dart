import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';

abstract final class QmGradients {
  static const LinearGradient brand = LinearGradient(
    begin: Alignment.centerRight,
    end: Alignment.centerLeft,
    colors: [QmColors.coral, QmColors.pink, QmColors.purple],
  );

  static LinearGradient get softBackground => LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: QmColors.useDarkPalette
        ? const [Color(0xFF181120), Color(0xFF100B18)]
        : const [Color(0xFFFFFFFF), Color(0xFFF9F7FF)],
  );
}
