enum AccountRole {
  student('student', 'طالب'),
  parent('parent', 'ولي أمر');

  const AccountRole(this.databaseValue, this.arabicLabel);

  final String databaseValue;
  final String arabicLabel;

  static AccountRole? fromDatabase(String? value) {
    for (final role in values) {
      if (role.databaseValue == value) return role;
    }
    return null;
  }
}
