import 'package:qudrat_maghrabi_app/features/parent_home/domain/parent_home_snapshot.dart';

abstract interface class ParentHomeRepository {
  Future<ParentHomeSnapshot> load({required String parentId});

  Future<ParentLinkCode> createParentLinkCode();

  Future<void> linkStudentByCode({required String code});

  Future<void> sendReminder({
    required String studentId,
    required String parentName,
    String? lessonTitle,
  });
}

class ParentHomeFailure implements Exception {
  const ParentHomeFailure(this.message);

  final String message;

  @override
  String toString() => message;
}
