import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { LESSON_FILES_BUCKET } from '../lib/lessonFileDelivery'

export default function LessonFileDownload() {
  const { fileId } = useParams<{ fileId: string }>()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (loading || !fileId) return
    let cancelled = false
    setError('')

    async function openFile() {
      try {
        const { data: file, error: fileError } = await supabase.from('lesson_files')
          .select('storage_path').eq('id', fileId).single()
        if (cancelled) return
        if (fileError || !file) {
          if (!user) {
            navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true })
            return
          }
          throw new Error('الملف غير متاح لحسابك. تأكد من صلاحية اشتراكك أو تواصل مع الدعم.')
        }
        if (!file.storage_path) throw new Error('هذا الملف يحتاج إعادة رفع. تواصل مع إدارة المنصة.')

        const { data, error: signingError } = await supabase.storage.from(LESSON_FILES_BUCKET)
          .createSignedUrl(file.storage_path, 60)
        if (signingError || !data) throw new Error('تعذّر تجهيز الملف. حاول مرة أخرى.')
        if (!cancelled) window.location.replace(data.signedUrl)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'تعذّر فتح الملف. حاول مرة أخرى.')
      }
    }

    void openFile()
    return () => { cancelled = true }
  }, [fileId, loading, user?.id, navigate, location.pathname, retry])

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm max-w-md w-full text-center">
        <h1 className="text-2xl font-black text-brand-navy mb-4">ملف الدرس</h1>
        <p role={error ? 'alert' : 'status'} className="text-gray-600 mb-6">
          {error || 'جاري تجهيز الملف…'}
        </p>
        {error && (
          <button className="btn-primary w-full mb-4" onClick={() => setRetry(value => value + 1)}>
            إعادة المحاولة
          </button>
        )}
        <Link className="text-brand-pink font-bold" to="/dashboard">العودة للمنصة</Link>
      </div>
    </main>
  )
}
