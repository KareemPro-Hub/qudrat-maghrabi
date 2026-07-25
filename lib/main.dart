import 'package:flutter/widgets.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';
import 'package:qudrat_maghrabi_app/core/config/app_environment.dart';
import 'package:qudrat_maghrabi_app/features/account/data/supabase_account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/supabase_auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/supabase_student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/supabase_student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/supabase_student_quiz_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  AppEnvironment.validate();

  await Supabase.initialize(
    url: AppEnvironment.supabaseUrl,
    publishableKey: AppEnvironment.supabasePublishableKey,
  );

  final client = Supabase.instance.client;
  runApp(
    QudratMaghrabiApp(
      authRepository: SupabaseAuthRepository(client),
      accountRepository: SupabaseAccountRepository(client),
      studentHomeRepository: SupabaseStudentHomeRepository(client),
      studentLearningRepository: SupabaseStudentLearningRepository(client),
      studentQuizRepository: SupabaseStudentQuizRepository(client),
    ),
  );
}
