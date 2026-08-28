// الدخول بالبصمة على المنصة (Passkeys / WebAuthn).
// الجهاز بيحتفظ بالمفتاح الخاص، والمنصة بتتحقق منه — من غير كلمة مرور.

export function isPasskeySupported() {
  return typeof window !== 'undefined'
    && typeof window.PublicKeyCredential !== 'undefined'
    && typeof navigator !== 'undefined'
    && !!navigator.credentials
}

const PASSKEY_ERRORS: Record<string, string> = {
  passkey_disabled: 'الدخول بالبصمة غير مفعّل حاليًا',
  too_many_passkeys: 'وصلت للحد الأقصى من البصمات المسجّلة على حسابك',
  webauthn_credential_exists: 'هذا الجهاز مسجّل بالفعل على حسابك',
  webauthn_credential_not_found: 'لا توجد بصمة مسجّلة لهذا الجهاز. سجّل الدخول بكلمة المرور ثم فعّلها',
  webauthn_challenge_not_found: 'انتهت صلاحية المحاولة. جرّب مرة أخرى',
  webauthn_challenge_expired: 'انتهت صلاحية المحاولة. جرّب مرة أخرى',
  webauthn_verification_failed: 'تعذّر التحقق من البصمة. جرّب مرة أخرى',
  email_not_confirmed: 'أكّد بريدك الإلكتروني أولًا',
  user_banned: 'هذا الحساب موقوف',
}

// إلغاء المستخدم لنافذة البصمة مش خطأ يستاهل رسالة حمراء.
export function isPasskeyCancelled(error: unknown) {
  const name = (error as { name?: string })?.name
  return name === 'NotAllowedError' || name === 'AbortError'
}

export function passkeyErrorMessage(error: unknown, fallback: string) {
  if (isPasskeyCancelled(error)) return ''
  const code = (error as { code?: string })?.code
  if (code && PASSKEY_ERRORS[code]) return PASSKEY_ERRORS[code]
  return fallback
}
