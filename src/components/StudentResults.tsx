import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Expand, Trophy } from 'lucide-react'
import '../styles/student-results.css'

const results = [
  { score: 98, image: '/reviews/results/score-98.jpg', width: 739, height: 1600, light: false },
  { score: 99, image: '/reviews/results/score-99.jpg', width: 588, height: 1280, light: true },
  { score: 96, image: '/reviews/results/score-96.jpg', width: 591, height: 1280, light: false },
  { score: 100, image: '/reviews/results/score-100.jpg', width: 942, height: 1280, light: false },
]

export default function StudentResults() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isOpen = activeIndex !== null
  const active = activeIndex === null ? null : results[activeIndex]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !isOpen || dialog.open) return
    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isOpen])

  function navigate(offset: number) {
    setActiveIndex(index => index === null ? null : (index + offset + results.length) % results.length)
  }

  return (
    <div className="qm-results" aria-labelledby="qm-results-title">
      <div className="qm-results-heading">
        <span className="qm-results-eyebrow"><Trophy size={16} aria-hidden="true" /> من نتائج طلابنا</span>
        <h3 id="qm-results-title">نتائج تتحدث <span>عن نفسها</span></h3>
        <p>وراء كل درجة، اجتهاد وقصة تستحق الفخر.</p>
      </div>

      <div className="qm-results-grid">
        {results.map((result, index) => (
          <button
            key={result.score}
            type="button"
            className="qm-result-card"
            aria-label={`تكبير صورة نتيجة ${result.score} من 100 في اختبار القدرات`}
            aria-haspopup="dialog"
            onClick={() => setActiveIndex(index)}
          >
            <span className="qm-result-caption">
              <span className="qm-result-score"><b>{result.score}</b><small>من 100</small></span>
              <span className="qm-result-label">درجة في اختبار القدرات</span>
            </span>
            <span className={`qm-result-frame${result.light ? ' qm-result-frame-light' : ''}`}>
              <img
                src={result.image}
                alt={`لقطة نتيجة اختبار القدرات، الدرجة الكلية ${result.score} من 100`}
                width={result.width}
                height={result.height}
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="qm-result-expand"><Expand size={15} aria-hidden="true" /> استعرض النتيجة</span>
          </button>
        ))}
      </div>
      <p className="qm-results-hint">اضغط على أي نتيجة لعرض الصورة كاملة</p>

      <dialog
        ref={dialogRef}
        className="qm-result-dialog"
        dir="rtl"
        aria-labelledby="qm-result-dialog-title"
        onClose={() => setActiveIndex(null)}
        onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close() }}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            navigate(event.key === 'ArrowLeft' ? 1 : -1)
          }
        }}
      >
        {active && (
          <div className="qm-result-dialog-content">
            <header>
              <div><span>من نتائج طلابنا</span><h3 id="qm-result-dialog-title">نتيجة {active.score} من 100</h3></div>
              <button type="button" onClick={() => dialogRef.current?.close()} autoFocus>إغلاق</button>
            </header>
            <img src={active.image} alt={`صورة النتيجة الكاملة: ${active.score} من 100`} width={active.width} height={active.height} />
            <footer>
              <button type="button" onClick={() => navigate(-1)} aria-label="النتيجة السابقة"><ArrowRight size={19} aria-hidden="true" /></button>
              <a href={active.image} target="_blank" rel="noopener noreferrer">فتح الصورة الأصلية</a>
              <button type="button" onClick={() => navigate(1)} aria-label="النتيجة التالية"><ArrowLeft size={19} aria-hidden="true" /></button>
            </footer>
          </div>
        )}
      </dialog>
    </div>
  )
}
