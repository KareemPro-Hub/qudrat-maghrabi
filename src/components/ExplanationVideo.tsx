import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

/// مشغّل فيديو «عرفني الإجابة الصحيحة» — يُستخدم في صفحة حل الاختبار وفي صفحة
/// مراجعة الإجابات. كان معرَّفًا داخل QuizResult.tsx فقط، ونُقل هنا كما هو
/// بلا أي تغيير في سلوكه لما صار الزر يظهر أثناء الاختبار أيضًا.
const EXPLANATION_WM_SPOTS = [
  { top: '8%', left: '6%' },
  { top: '8%', left: '58%' },
  { top: '78%', left: '58%' },
  { top: '78%', left: '6%' },
] as const

export default function ExplanationVideo({ videoId, courseId, sessionToken, watermark, onClose }: { videoId: string, courseId: string, sessionToken: string, watermark: string, onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [src, setSrc] = useState('')
  // نفس علامة مشغّل الدرس: بتتنقّل بين أربع زوايا كل 12 ثانية عشان ما تتقصّش من الصورة.
  const [wmSpot, setWmSpot] = useState(0)

  useEffect(() => {
    if (!watermark) return
    const timer = setInterval(() => setWmSpot((spot) => (spot + 1) % 4), 12000)
    return () => clearInterval(timer)
  }, [watermark])

  useEffect(() => {
    // من غير الفحص ده كان الطلب بيتبعت بتوكن فاضي لو الجلسة لسه بتتحمّل،
    // فتظهر رسالة "تعذّر تحميل الفيديو" ومتتصلحش لوحدها بعد ما التوكن يجهز.
    if (!sessionToken) return
    let destroyed = false
    async function init() {
      try {
        const res = await fetch('/api/bunny-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ videoId, courseId }),
        })
        const { libraryId, token, expires, error: apiError } = await res.json()
        if (apiError || !token) throw new Error(apiError || 'تعذّر تحميل الفيديو')
        if (destroyed) return
        setSrc(`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`)
        setLoading(false)
      } catch (e: any) { if (!destroyed) { setError(e.message); setLoading(false) } }
    }
    init()
    return () => { destroyed = true }
  }, [videoId, sessionToken])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-black rounded-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-3 left-3 z-10 bg-white/20 hover:bg-white/40 rounded-full p-1.5 text-white transition-colors">
          <X size={18} />
        </button>
        {loading && <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" /></div>}
        {error && <div className="h-64 flex items-center justify-center text-red-400 font-bold">{error}</div>}
        {src && !error && (
          <div style={{ position: 'relative', aspectRatio: '16/9' }}>
            <iframe
              src={src}
              loading="lazy"
              style={{ border: 0, position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
            {watermark && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  ...EXPLANATION_WM_SPOTS[wmSpot],
                  pointerEvents: 'none',
                  userSelect: 'none',
                  color: 'rgba(255,255,255,.42)',
                  fontSize: 12,
                  fontWeight: 700,
                  textShadow: '0 1px 3px rgba(0,0,0,.85)',
                  whiteSpace: 'nowrap',
                  transition: 'top .8s ease, left .8s ease',
                  zIndex: 5,
                }}
              >
                {watermark}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
