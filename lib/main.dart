import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';
import 'package:qudrat_maghrabi_app/core/config/app_environment.dart';
import 'package:qudrat_maghrabi_app/features/account/data/supabase_account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/supabase_auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/notifications/data/supabase_notification_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/supabase_student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/supabase_student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/supabase_student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/in_app_purchase_subscription_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    AppEnvironment.validate();

    await Supabase.initialize(
      url: AppEnvironment.supabaseUrl,
      publishableKey: AppEnvironment.supabasePublishableKey,
    ).timeout(const Duration(seconds: 20));

    final client = Supabase.instance.client;
    runApp(
      QudratMaghrabiApp(
        authRepository: SupabaseAuthRepository(client),
        accountRepository: SupabaseAccountRepository(client),
        studentHomeRepository: SupabaseStudentHomeRepository(client),
        studentLearningRepository: SupabaseStudentLearningRepository(client),
        studentQuizRepository: SupabaseStudentQuizRepository(client),
        subscriptionRepository: InAppPurchaseSubscriptionRepository(client),
        notificationRepository: SupabaseNotificationRepository(client),
      ),
    );
  } catch (error, stackTrace) {
    FlutterError.reportError(
      FlutterErrorDetails(
        exception: error,
        stack: stackTrace,
        library: 'app startup',
      ),
    );
    runApp(const AppStartupFailure());
  }
}

class AppStartupFailure extends StatelessWidget {
  const AppStartupFailure({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
          backgroundColor: Color(0xFFFAF7FF),
          body: SafeArea(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(28),
                child: Text(
                  'تعذّر تشغيل التطبيق الآن.\nتحقق من اتصال الإنترنت ثم افتح التطبيق مجددًا.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF2B1147),
                    fontSize: 19,
                    height: 1.6,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
