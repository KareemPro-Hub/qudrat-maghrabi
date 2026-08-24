import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';

class FoundationScreen extends StatelessWidget {
  const FoundationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Image.asset(
                    'assets/brand/qudrat_maghrabi_logo.png',
                    width: 180,
                    semanticLabel: 'شعار قدرات المغربي',
                  ),
                  const SizedBox(height: 28),
                  Text(
                    'قدرات المغربي',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: QmColors.textPrimary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'لا تحفظ ! افهم وتفوّق 🔥',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: QmColors.textSecondary,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
