class StudentSubscription {
  const StudentSubscription({
    required this.bundleId,
    required this.planName,
    required this.startedAt,
    required this.expiresAt,
  });

  final String bundleId;
  final String planName;
  final DateTime? startedAt;
  final DateTime? expiresAt;

  int? get remainingDays {
    final expiry = expiresAt;
    if (expiry == null) return null;
    final remaining = expiry.difference(DateTime.now()).inDays;
    return remaining < 0 ? 0 : remaining + 1;
  }
}
