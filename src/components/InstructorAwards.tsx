import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Award, Expand } from 'lucide-react'
import '../styles/instructor-awards.css'

const certificates = [
  {
    title: 'تكريم «إبداع 2025»',
    issuer: 'الإدارة العامة للتعليم بمنطقة الرياض',
    description: 'شكر وتقدير للمساهمة في نشر ثقافة الموهبة والإبداع.',
    category: 'تقدير للجهود التعليمية',
    image: '/awards/ibdaa-2025.jpeg', width: 1080, height: 708,
  },
  {
    title: 'تدريب المدربين TOT',
    issuer: 'مركز سهم المعتمد للتدريب',
    description: 'شهادة حضور دورة تدريب المدربين بواقع 30 ساعة تدريبية.',
    category: 'تطوير مهني',
    image: '/awards/training-of-trainers.jpg', width: 3508, height: 2480,
  },
  {
    title: 'تكريم «إبداع 2024»',
    issuer: 'إدارة الموهوبين · تعليم الرياض',
    description: 'تقدير للجهود في دعم مشاركة الطلاب بالأولمبياد الوطني للإبداع العلمي.',
    category: 'دعم الموهبة والإبداع',
    image: '/awards/ibdaa-2024.jpeg', width: 999, height: 734,
  },
]

function Laurel() {
  return (
    <svg className="qm-awards-laurel" viewBox="0 0 120 90" fill="none" aria-hidden="true">
      <path d="M49 78C19 68 13 36 32 13M71 78c30-10 36-42 17-65" stroke="currentColor" strokeWidth="1.5" />
      <g fill="currentColor">
        <path d="M30 18c-10-1-13 5-11 12 8-1 12-5 11-12ZM23 32c-10 1-11 8-7 14 7-3 10-7 7-14ZM23 48c-10 3-9 10-3 15 6-5 7-9 3-15ZM30 62c-9 6-6 12 1 15 4-6 4-11-1-15ZM34 23c9-2 12-7 9-14-8 2-11 6-9 14ZM28 39c9-4 10-10 5-15-7 4-9 9-5 15ZM31 54c8-6 7-12 1-16-6 6-7 11-1 16ZM40 67c6-8 4-13-4-15-4 7-3 12 4 15Z" />
        <g transform="translate(120 0) scale(-1 1)"><path d="M30 18c-10-1-13 5-11 12 8-1 12-5 11-12ZM23 32c-10 1-11 8-7 14 7-3 10-7 7-14ZM23 48c-10 3-9 10-3 15 6-5 7-9 3-15ZM30 62c-9 6-6 12 1 15 4-6 4-11-1-15ZM34 23c9-2 12-7 9-14-8 2-11 6-9 14ZM28 39c9-4 10-10 5-15-7 4-9 9-5 15ZM31 54c8-6 7-12 1-16-6 6-7 11-1 16ZM40 67c6-8 4-13-4-15-4 7-3 12 4 15Z" /></g>
      </g>
    </svg>
  )
}

export default function InstructorAwards() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isOpen = selectedIndex !== null
  const selected = selectedIndex === null ? null : certificates[selectedIndex]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !isOpen || dialog.open) return
    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isOpen])

  function navigate(offset: number) {
    setSelectedIndex(index => index === null ? null : (index + offset + certificates.length) % certificates.length)
  }

  return (
    <section id="qm-awards" className="qm-awards qm-wrap qm-section" aria-labelledby="qm-awards-title">
      <div className="qm-awards-panel">
        <header className="qm-awards-heading">
          <div className="qm-awards-emblem"><Laurel /><Award size={32} strokeWidth={1.5} aria-hidden="true" /></div>
          <span className="qm-awards-eyebrow">شهادات وتكريمات</span>
          <h2 id="qm-awards-title">خبرة تُلهم<span>… وإنجازات تُقدَّر</span></h2>
          <p>محطات نعتز بها في مسيرة <strong>أ. علي مغربي</strong><span>مدير منصة قدرات المغربي</span></p>
        </header>

        <div className="qm-awards-grid">
          {certificates.map((certificate, index) => (
            <article className="qm-award-card" key={certificate.image}>
              <div className="qm-award-collection" aria-hidden="true"><span />{String(index + 1).padStart(2, '0')}<span /></div>
              <button
                type="button"
                className="qm-award-preview"
                aria-label={`عرض شهادة ${certificate.title}`}
                aria-haspopup="dialog"
                onClick={() => setSelectedIndex(index)}
              >
                <span className="qm-award-mat">
                  <img src={certificate.image} alt={`شهادة ${certificate.title} للأستاذ علي مغربي`} width={certificate.width} height={certificate.height} loading="lazy" decoding="async" />
                </span>
                <span className="qm-award-view"><Expand size={14} aria-hidden="true" /> عرض الشهادة</span>
              </button>
              <div className="qm-award-details">
                <span className="qm-award-category">{certificate.category}</span>
                <h3>{certificate.title}</h3>
                <p className="qm-award-issuer">{certificate.issuer}</p>
                <p className="qm-award-description">{certificate.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="qm-awards-signature" aria-hidden="true"><span /><Award size={17} strokeWidth={1.4} /><span /></div>
      </div>

      <dialog
        ref={dialogRef}
        className="qm-award-dialog"
        dir="rtl"
        aria-labelledby="qm-award-dialog-title"
        onClose={() => setSelectedIndex(null)}
        onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close() }}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            navigate(event.key === 'ArrowLeft' ? 1 : -1)
          }
        }}
      >
        {selected && (
          <div className="qm-award-dialog-content">
            <header><div><span>شهادات أ. علي مغربي</span><h3 id="qm-award-dialog-title">{selected.title}</h3></div><button type="button" autoFocus onClick={() => dialogRef.current?.close()}>إغلاق</button></header>
            <img src={selected.image} alt={`الشهادة الكاملة: ${selected.title}`} width={selected.width} height={selected.height} />
            <footer>
              <button type="button" onClick={() => navigate(-1)} aria-label="الشهادة السابقة"><ArrowRight size={19} aria-hidden="true" /></button>
              <a href={selected.image} target="_blank" rel="noopener noreferrer">فتح الشهادة بالدقة الأصلية</a>
              <button type="button" onClick={() => navigate(1)} aria-label="الشهادة التالية"><ArrowLeft size={19} aria-hidden="true" /></button>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  )
}
