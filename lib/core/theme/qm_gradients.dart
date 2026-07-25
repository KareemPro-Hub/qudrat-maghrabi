import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';

abstract final class QmGradients {
  static const LinearGradient brand = LinearGradient(
    begin: Alignment.centerRight,
    end: Alignment.centerLeft,
    colors: [QmColors.coral, QmColors.pink, QmColors.purple],
  );

  static const LinearGradient softBackground = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFFFFFFF), QmColors.background],
  );
}
