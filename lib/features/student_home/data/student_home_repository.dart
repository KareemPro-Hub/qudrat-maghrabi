import 'package:qudrat_maghrabi_app/features/student_home/domain/student_home_snapshot.dart';

abstract interface class StudentHomeRepository {
  Future<StudentHomeSnapshot> load({required String studentId});
}
