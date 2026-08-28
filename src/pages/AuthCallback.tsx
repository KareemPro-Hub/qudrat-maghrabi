import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type CallbackStatus = 'processing' | 'success' | 'error'

const ADMIN_ROLES = ['admin', 'teacher', 'content_manager', 'student_manager', 'quiz_manager']

const RETURN_TO_KEY = 'qm_auth_return_to'

function isSafePath(value: string | null) {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

function getSafeReturnTo(search: string) {
  const value = new URLSearchParams(search).get('returnTo')
  if (isSafePath(value)) return value
  try {
    const stored = localStorage.getItem(RETURN_TO_KEY)
    if (isSafePath(stored)) return stored
  } catch {
    // localStorage unavailable (private mode) — fall back to the default route
  }
  return null
}

function mapCallbackError(errorCode: string | null, errorDescription: string | null) {
  switch (errorCode) {
    case 'otp_expired':
      return 'انتهت صلاحية رابط التأكيد. اطلب رابطًا جديدًا من صفحة تسجيل الدخول'
    case 'access_denied':
      return 'الرابط غير صالح أو تم استخدامه من قبل. اطلب رابطًا جديدًا من صفحة تسجيل الدخول'
    default:
      return errorDescription
        ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        : 'تعذّر إكمال تأكيد الحساب. جرّب فتح الرابط من رسالة البريد مجددًا أو اطلب رابطًا جديدًا'
  }
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<CallbackStatus>('processing')
  const [errorMsg, setErrorMsg] = useState('')
  const finishedRef = useRef(false)
  const returnTo = getSafeReturnTo(window.location.search)

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    async function routeAfterSession(session: { user: { id: string } }) {
      if (finishedRef.current || cancelled) return
      finishedRef.current = true
      setStatus('success')
      try { localStorage.removeItem(RETURN_TO_KEY) } catch { /* ignore */ }
      toast.success('تم تأكيد بريدك بنجاح !')

      try {
        const { data: primaryProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        const target = primaryProfile && ADMIN_ROLES.includes(primaryProfile.role)
          ? '/admin'
          : (returnTo || '/dashboard')

        setTimeout(() => { if (!cancelled) navigate(target, { replace: true }) }, 900)
      } catch {
        setTimeout(() => { if (!cancelled) navigate(returnTo || '/dashboard', { replace: true }) }, 900)
      }
    }

    function fail(message: string) {
      if (finishedRef.current || cancelled) return
      finishedRef.current = true
      setStatus('error')
      setErrorMsg(message)
    }

    async function run() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const searchParams = new URLSearchParams(window.location.search)
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code')
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const otpType = searchParams.get('type')

      if (errorCode || hashParams.get('error') || searchParams.get('error')) {
        fail(mapCallbackError(errorCode, errorDescription))
        return
      }

      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          type: (otpType as EmailOtpType) || 'email',
          token_hash: tokenHash,
        })
        if (cancelled) return
        if (error || !data.session) {
          fail('تعذّر إكمال التأكيد. الرابط قد يكون منتهي الصلاحية، اطلب رابطًا جديدًا')
          return
        }
        await routeAfterSession(data.session)
        return
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error || !data.session) {
          fail('تعذّر إكمال التأكيد. الرابط قد يكون منتهي الصلاحية، اطلب رابطًا جديدًا')
          return
        }
        await routeAfterSession(data.session)
        return
      }

      // Implicit flow: supabase-js parses the URL hash automatically on client init.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await routeAfterSession(session)
        return
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) routeAfterSession(session)
    })

    run()

    timeoutId = setTimeout(() => {
      if (finishedRef.current || cancelled) return
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        if (session) routeAfterSession(session)
        else fail('لم يكتمل تأكيد الحساب. تأكد من فتح آخر رابط وصلك بالبريد، أو اطلب رابطًا جديدًا من صفحة تسجيل الدخول')
      })
    }, 8000)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #2D174B 0%, #3D1070 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-brand-lg p-8 md:p-10 text-center">
          <img src="/logo.png" alt="قدرات المغربي" className="h-16 w-auto object-contain mx-auto mb-6" />

          {status === 'processing' && (
            <>
              <div className="py-6 flex justify-center" aria-label="جاري تأكيد الحساب">
                <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
              </div>
              <h1 className="text-xl font-black text-brand-navy mb-2">جاري تأكيد حسابك...</h1>
              <p className="text-gray-500 text-sm">لحظات ونكمل تفعيل حسابك</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="py-4 flex justify-center text-green-500">
                <CheckCircle2 size={56} strokeWidth={1.6} />
              </div>
              <h1 className="text-xl font-black text-brand-navy mb-2">تم تأكيد بريدك بنجاح !</h1>
              <p className="text-gray-500 text-sm">جاري تحويلك إلى لوحة التحكم...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="py-4 flex justify-center text-red-500">
                <XCircle size={56} strokeWidth={1.6} />
              </div>
              <h1 className="text-xl font-black text-brand-navy mb-2">تعذّر إكمال التأكيد</h1>
              <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
              <div className="space-y-3">
                <Link to="/login" className="btn-primary w-full py-4 text-lg text-center block">
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
