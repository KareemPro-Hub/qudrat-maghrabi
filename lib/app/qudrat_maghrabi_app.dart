import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:qudrat_maghrabi_app/core/presentation/brand_launch_gate.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_theme.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/auth_gate.dart';
import 'package:qudrat_maghrabi_app/features/notifications/data/notification_repository.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/data/parent_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/subscription_repository.dart';

class QudratMaghrabiApp extends StatelessWidget {
  const QudratMaghrabiApp({
    required this.authRepository,
    required this.accountRepository,
    required this.parentHomeRepository,
    required this.studentHomeRepository,
    required this.studentLearningRepository,
    required this.studentQuizRepository,
    this.subscriptionRepository = const UnavailableSubscriptionRepository(),
    this.notificationRepository = const EmptyNotificationRepository(),
    super.key,
  });

  final AuthRepository authRepository;
  final AccountRepository accountRepository;
  final ParentHomeRepository parentHomeRepository;
  final StudentHomeRepository studentHomeRepository;
  final StudentLearningRepository studentLearningRepository;
  final StudentQuizRepository studentQuizRepository;
  final SubscriptionRepository subscriptionRepository;
  final NotificationRepository notificationRepository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
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
      builder: (context, child) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: BrandLaunchGate(
        child: AuthGate(
          authRepository: authRepository,
          accountRepository: accountRepository,
          parentHomeRepository: parentHomeRepository,
          studentHomeRepository: studentHomeRepository,
          studentLearningRepository: studentLearningRepository,
          studentQuizRepository: studentQuizRepository,
          subscriptionRepository: subscriptionRepository,
          notificationRepository: notificationRepository,
        ),
      ),
    );
  }
}
