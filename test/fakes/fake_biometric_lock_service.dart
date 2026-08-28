import 'package:qudrat_maghrabi_app/features/auth/data/biometric_lock_service.dart';

class FakeBiometricLockService extends BiometricLockService {
  FakeBiometricLockService({
    this.supported = true,
    this.enabled = false,
    this.authenticateResult = true,
  });

  bool supported;
  bool enabled;
  bool authenticateResult;
  int authenticateCalls = 0;

  @override
  Future<bool> isSupported() async => supported;

  @override
  Future<bool> isEnabled() async => enabled;

  @override
  Future<void> setEnabled(bool value) async => enabled = value;

  @override
  Future<bool> authenticate({String reason = ''}) async {
    authenticateCalls += 1;
    return authenticateResult;
  }
}
