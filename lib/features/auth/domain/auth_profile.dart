import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';

class AuthProfile {
  const AuthProfile({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    required this.primaryRole,
    required this.canUseParentPortal,
    required this.isActive,
  });

  final String id;
  final String fullName;
  final String email;
  final String phone;
  final AccountRole role;
  final AccountRole primaryRole;
  final bool canUseParentPortal;
  final bool isActive;

  AuthProfile copyWith({
    String? fullName,
    String? email,
    String? phone,
    AccountRole? role,
    AccountRole? primaryRole,
    bool? canUseParentPortal,
    bool? isActive,
  }) {
    return AuthProfile(
      id: id,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      primaryRole: primaryRole ?? this.primaryRole,
      canUseParentPortal: canUseParentPortal ?? this.canUseParentPortal,
      isActive: isActive ?? this.isActive,
    );
  }
}
