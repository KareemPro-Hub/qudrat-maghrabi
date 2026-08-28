import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:qudrat_maghrabi_app/core/presentation/brand_launch_gate.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_theme.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_theme_mode.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/biometric_lock_service.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/auth_gate.dart';
import 'package:qudrat_maghrabi_app/features/notifications/data/notification_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/subscription_repository.dart';

class QudratMaghrabiApp extends StatefulWidget {
  const QudratMaghrabiApp({
    required this.authRepository,
    required this.accountRepository,
    required this.studentHomeRepository,
    required this.studentLearningRepository,
    required this.studentQuizRepository,
    this.subscriptionRepository = const UnavailableSubscriptionRepository(),
    this.notificationRepository = const EmptyNotificationRepository(),
    this.biometricLock,
    super.key,
  });

  final AuthRepository authRepository;
  final AccountRepository accountRepository;
  final StudentHomeRepository studentHomeRepository;
  final StudentLearningRepository studentLearningRepository;
  final StudentQuizRepository studentQuizRepository;
  final SubscriptionRepository subscriptionRepository;
  final NotificationRepository notificationRepository;
  final BiometricLockService? biometricLock;

  @override
  State<QudratMaghrabiApp> createState() => _QudratMaghrabiAppState();
}

class _QudratMaghrabiAppState extends State<QudratMaghrabiApp> {
  final _themeController = QmThemeModeController();

  @override
  void initState() {
    super.initState();
    _themeController.load();
  }

  @override
  void dispose() {
    _themeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return QmThemeModeScope(
      controller: _themeController,
      child: ListenableBuilder(
        listenable: _themeController,
        builder: (context, _) => MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'قدرات المغربي',
          locale: const Locale('ar'),
          supportedLocales: const [Locale('ar'), Locale('en')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: QmTheme.light,
          darkTheme: QmTheme.dark,
          themeMode: _themeController.themeMode,
          builder: (context, child) {
            final isDark = Theme.of(context).brightness == Brightness.dark;
            QmColors.useDarkPalette = isDark;
            final overlayStyle =
                (isDark
                        ? SystemUiOverlayStyle.light
                        : SystemUiOverlayStyle.dark)
                    .copyWith(
                      statusBarColor: Colors.transparent,
                      systemNavigationBarColor: isDark
                          ? const Color(0xFF100B18)
                          : const Color(0xFFF9F7FF),
                      systemNavigationBarIconBrightness: isDark
                          ? Brightness.light
                          : Brightness.dark,
                    );
            return AnnotatedRegion<SystemUiOverlayStyle>(
              value: overlayStyle,
              child: Directionality(
                textDirection: TextDirection.rtl,
                child: child ?? const SizedBox.shrink(),
              ),
            );
          },
          home: BrandLaunchGate(
            child: AuthGate(
              authRepository: widget.authRepository,
              accountRepository: widget.accountRepository,
              studentHomeRepository: widget.studentHomeRepository,
              studentLearningRepository: widget.studentLearningRepository,
              studentQuizRepository: widget.studentQuizRepository,
              subscriptionRepository: widget.subscriptionRepository,
              notificationRepository: widget.notificationRepository,
              biometricLock: widget.biometricLock,
            ),
          ),
        ),
      ),
    );
  }
}
