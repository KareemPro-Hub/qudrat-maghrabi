import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';

class AuthFlowScaffold extends StatelessWidget {
  const AuthFlowScaffold({
    required this.title,
    required this.subtitle,
    required this.child,
    this.showBackButton = true,
    super.key,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final bool showBackButton;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.fromLTRB(24, 10, 24, 28),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight > 38
                        ? constraints.maxHeight - 38
                        : 0,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 430),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (showBackButton)
                            Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: IconButton.filledTonal(
                                key: const Key('auth-back-button'),
                                tooltip: 'رجوع',
                                onPressed: () => Navigator.maybePop(context),
                                icon: const Icon(Icons.arrow_forward_rounded),
                              ),
                            )
                          else
                            const SizedBox(height: 48),
                          const SizedBox(height: 8),
                          Image.asset(
                            'assets/brand/qudrat_maghrabi_logo.png',
                            width: 126,
                            height: 112,
                            fit: BoxFit.contain,
                            semanticLabel: 'شعار قدرات المغربي',
                          ),
                          const SizedBox(height: 18),
                          Text(
                            title,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.headlineMedium
                                ?.copyWith(
                                  color: QmColors.textPrimary,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                          const SizedBox(height: 7),
                          Text(
                            subtitle,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodyLarge
                                ?.copyWith(color: QmColors.textSecondary),
                          ),
                          const SizedBox(height: 28),
                          child,
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
