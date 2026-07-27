import { useEffect, useState, useRef } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Lock, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function BunnyPlayer({ videoId, courseId, sessionToken }: { videoId: string, courseId: string, sessionToken: string }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [src, setSrc] = useState('')

  useEffect(() => {
    let destroyed = false

    async function init() {
      setLoading(true)
      setError('')
      setSrc('')

      try {
        const res = await fetch('/api/bunny-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ videoId, courseId }),
        })
        const { libraryId, token, expires, error: apiError } = await res.json()
        if (apiError || !token) throw new Error(apiError || 'Failed to load video')
        if (destroyed) return

        setSrc(`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`)
        setLoading(false)
      } catch (e: any) {
        if (!destroyed) { setError(e.message); setLoading(false) }
      }
    }

    init()
    return () => { destroyed = true }
  }, [videoId])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid #d33dab', borderTopColor: 'transparent', animation: 'lessonSpin .8s linear infinite' }} />
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 10 }}>
          <p style={{ color: '#ff8a75', fontWeight: 700 }}>{error}</p>
        </div>
      )}
      {src && !error && (
        <iframe
          src={src}
          style={{ border: 0, position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }}
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen;"
          allowFullScreen
        />
      )}
    </div>
  )
}

function fmtCount(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export default function Learn() {
  const { courseId, chapterId, lessonId } = useParams<{ courseId: string; chapterId?: string; lessonId?: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const [sessionToken, setSessionToken] = useState<string>('')
  const [course, setCourse] = useState<any>(null)
  const [chapter, setChapter] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quizByLesson, setQuizByLesson] = useState<Record<string, any>>({})
  const [passedQuizIds, setPassedQuizIds] = useState<Set<string>>(new Set())
  const [lessonFiles, setLessonFiles] = useState<any[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'summary' | 'files' | 'training'>('summary')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; title: string; text: string }>({ show: false, title: '', text: '' })
  const toastTimer = useRef<any>(null)
  const contentSurfaceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && user && courseId) {
      fetchData()
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSessionToken(session?.access_token || '')
      })
    }
  }, [user, authLoading, courseId, chapterId, lessonId])

  async function fetchData() {
    let lessonsQuery = supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index')
    lessonsQuery = chapterId ? lessonsQuery.eq('chapter_id', chapterId) : lessonsQuery
    const [{ data: c }, { data: ch }, { data: l }, { data: e }, { data: p }, { data: q }, { data: qr }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      chapterId ? supabase.from('chapters').select('*').eq('id', chapterId).single() : Promise.resolve({ data: null }),
      lessonsQuery,
      supabase.from('enrollments').select('id').eq('student_id', user!.id).eq('course_id', courseId!).eq('payment_status', 'paid').single(),
      supabase.from('lesson_progress').select('lesson_id, completed').eq('student_id', user!.id),
      supabase.from('quizzes').select('*').eq('course_id', courseId!).not('lesson_id', 'is', null),
      supabase.from('quiz_results').select('quiz_id').eq('student_id', user!.id).eq('passed', true),
    ])
    setCourse(c)
    setChapter(ch)
    setLessons(l || [])
    // الكورس المجاني بالكامل (سعر 0) يعامل معاملة المشترك
    setEnrolled(!!e || Number(c?.price) === 0)

    const progressMap: Record<string, boolean> = {}
    p?.forEach((item: any) => { progressMap[item.lesson_id] = item.completed })
    setProgress(progressMap)

    const quizMap: Record<string, any> = {}
    q?.forEach((quiz: any) => { if (quiz.lesson_id) quizMap[quiz.lesson_id] = quiz })
    setQuizByLesson(quizMap)

    const passed = new Set<string>(qr?.map((r: any) => r.quiz_id) || [])
    setPassedQuizIds(passed)

    if (l && l.length > 0) {
      // الدرس المختار من شبكة دروس الباب له الأولوية، وإلا نفتح أول درس غير مكتمل
      const picked = (lessonId && l.find((lesson: any) => lesson.id === lessonId))
        || l.find((lesson: any) => !progressMap[lesson.id])
        || l[0]
      setCurrentLesson(picked)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!currentLesson) return
    setActiveTab('summary')
    supabase.from('lesson_files').select('*').eq('lesson_id', currentLesson.id).order('order_index')
      .then(({ data }) => setLessonFiles(data || []))
  }, [currentLesson?.id])

  useEffect(() => {
    const quiz = currentLesson ? quizByLesson[currentLesson.id] : null
    if (!quiz) { setQuestionCount(0); return }
    supabase.rpc('get_quiz_questions_for_student', { p_quiz_id: quiz.id })
      .then(({ data }) => setQuestionCount(data?.length || 0))
  }, [currentLesson?.id, quizByLesson])

  function isBlockedByQuiz(index: number): boolean {
    if (index === 0) return false
    const prevLesson = lessons[index - 1]
    const prevQuiz = quizByLesson[prevLesson?.id]
    if (!prevQuiz) return false
    return !passedQuizIds.has(prevQuiz.id)
  }

  async function markComplete(lessonId: string) {
    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('student_id', user!.id)
      .eq('lesson_id', lessonId)
      .single()

    if (existing) {
      await supabase.from('lesson_progress')
        .update({ completed: true, last_watched_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('lesson_progress')
        .insert({ student_id: user!.id, lesson_id: lessonId, completed: true, watch_percentage: 100 })
    }
    setProgress(prev => ({ ...prev, [lessonId]: true }))
    showToast('قربت 🎓', 'لم يتبقَّ الكثير. تخيّل شعورك يوم النتيجة.')
    void notifyCourseCompletion()
  }

  // تسجيل الإتمام نفسه يتم في قاعدة البيانات؛ هنا فقط نطلب إرسال إيميل الطالب وولي أمره
  // إذا كان الكورس قد اكتمل فعلًا. أي فشل هنا لا يؤثر على تقدّم الطالب.
  async function notifyCourseCompletion() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token || !courseId) return
      await fetch('/api/notify-course-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ courseId }),
      })
    } catch {
      // تجاهل: الإشعار داخل المنصة مسجّل بالفعل
    }
  }

  function showToast(title: string, text: string) {
    setToast({ show: true, title, text })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }

  function goToTab(tab: 'summary' | 'files' | 'training') {
    setActiveTab(tab)
    contentSurfaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function startTraining() {
    goToTab('training')
    showToast('التدريب جاهز', questionCount > 0 ? `${questionCount} أسئلة متدرجة — ابدأ عندما تكون مستعدًا.` : 'لا يوجد تدريب لهذا الدرس بعد.')
  }

  const completedCount = Object.values(progress).filter(Boolean).length
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0
  const currentIndex = lessons.findIndex(l => l.id === currentLesson?.id)
  const currentQuiz = currentLesson ? quizByLesson[currentLesson.id] : null
  const quizPassed = currentQuiz ? passedQuizIds.has(currentQuiz.id) : false
  const isCurrentCompleted = currentLesson ? !!progress[currentLesson.id] : false
  const summaryPoints = (currentLesson?.description || '').split('\n').map((s: string) => s.trim()).filter(Boolean)
  const initial = (profile?.full_name || 'ط').charAt(0)

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" />
  if (!enrolled && course) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <Lock size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-black text-brand-navy mb-2">غير مشترك في هذا الكورس</h2>
        <p className="text-gray-500 mb-6">اشترك الآن للوصول لجميع الدروس والاختبارات</p>
        <Link to={`/courses/${courseId}`} className="btn-primary inline-block py-3 px-8">
          اشترك الآن ←
        </Link>
      </div>
    </div>
  )
  if (!currentLesson) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <BookOpen size={64} className="mx-auto text-gray-200 mb-4" />
        <p className="text-gray-400 font-bold mb-4">{chapterId ? 'لا توجد دروس في هذا الباب بعد' : 'لا توجد دروس في هذا الكورس بعد'}</p>
        {chapterId && (
          <Link to={`/learn/${courseId}/chapters`} className="btn-primary inline-block py-3 px-8">
            رجوع للأبواب
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <div className="lesson-hub-page" dir="rtl">
      <svg className="svg-sprite" aria-hidden="true">
        <symbol id="icon-training" viewBox="0 0 32 32">
          <rect x="6.5" y="4.5" width="16" height="23" rx="3"></rect>
          <path d="M11 4.5V3h7v1.5M11 11h7M11 16h5M11 21h4"></path>
          <path d="m21.5 18.5 5-5 2 2-5 5-3 1zM21.5 18.5l2 2"></path>
          <path d="m10 16 1.7 1.7 3.1-3.2"></path>
        </symbol>
        <symbol id="icon-file" viewBox="0 0 32 32">
          <path d="M8 3.5h10l6 6v19H8zM18 3.5v6h6M12 15h8M12 20h8M12 25h5"></path>
        </symbol>
        <symbol id="icon-video" viewBox="0 0 32 32">
          <rect x="4" y="6" width="24" height="20" rx="5"></rect><path d="m14 12 7 4-7 4z"></path>
        </symbol>
      </svg>

      <header className="hub-header">
        <Link className="hub-logo" to="/" aria-label="قدرات المغربي">
          <img src="/admin/logo.png" alt="قدرات المغربي" />
        </Link>

        <nav className="hub-breadcrumb" aria-label="مسار الدرس">
          <span>{course?.title}</span><i>/</i>{chapter && <><span>{chapter.title}</span><i>/</i></>}<strong>{currentLesson.title}</strong>
        </nav>

        <div className="hub-user-actions">
          <div className="hub-profile"><span>{initial}</span><p><b>{profile?.full_name}</b><small>طالب</small></p></div>
          {chapterId ? (
            <Link className="back-dashboard" to={`/learn/${courseId}/${chapterId}`}><svg viewBox="0 0 24 24"><path d="m14 7-5 5 5 5"></path></svg>رجوع للدروس</Link>
          ) : (
            <Link className="back-dashboard" to="/dashboard"><svg viewBox="0 0 24 24"><path d="m14 7-5 5 5 5"></path></svg>العودة للوحة</Link>
          )}
        </div>
      </header>

      <main className="lesson-hub">
        <section className="lesson-heading-row">
          <div className="lesson-heading-main">
            <div className="lesson-progress-ring" aria-label={`أنجزت ${progressPct} بالمئة من الكورس`} style={{ background: `radial-gradient(circle,#fff 0 62%,transparent 64%),conic-gradient(#7634da 0 ${progressPct}%,#eee8f3 ${progressPct}%)` }}>
              <strong>{progressPct}<small>%</small></strong>
            </div>
            <div>
              <h1>{currentLesson.title}</h1>
              <p><span></span>فيديو الدرس <i>•</i> الملفات <i>•</i> التدريب</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isCurrentCompleted ? (
              <span className="mark-complete-button done">
                <svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"></path></svg>مكتمل
              </span>
            ) : (
              <button className="mark-complete-button" type="button" onClick={() => markComplete(currentLesson.id)}>
                <svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"></path></svg>تم مشاهدة الدرس
              </button>
            )}
            <button className="course-content-button" type="button" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
              <svg viewBox="0 0 24 24"><path d="M4 7h16v13H4zM4 7l3-3h5l2 3"></path></svg>محتوى الكورس
            </button>
          </div>
        </section>

        <section className="learning-studio">
          <aside className="lesson-journey" aria-label="رحلة الدرس">
            <h2>رحلة الدرس</h2>
            <button className="journey-item current" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <span className="journey-icon"><svg><use href="#icon-video"></use></svg></span>
              <span><b>شاهد الدرس</b><small>{isCurrentCompleted ? 'أكملت مشاهدة هذا الدرس' : 'شاهد الفيديو كاملًا لإكمال الخطوة'}</small></span>
            </button>
            <button className="journey-item" type="button" onClick={() => goToTab('files')}>
              <span className="journey-icon"><svg><use href="#icon-file"></use></svg></span>
              <span><b>ملفات الدرس</b><small>{lessonFiles.length ? fmtCount(lessonFiles.length, 'ملف جاهز', 'ملفات جاهزة') : 'لا توجد ملفات بعد'}</small></span>
            </button>
            <button className="journey-item training" type="button" onClick={() => goToTab('training')}>
              <span className="journey-icon"><svg><use href="#icon-training"></use></svg></span>
              <span><b>تدريب الدرس</b><small>{currentQuiz ? `${fmtCount(questionCount, 'سؤال', 'أسئلة')} • ${currentQuiz.time_limit_minutes ? `${currentQuiz.time_limit_minutes} دقيقة` : 'بدون حد زمني'}` : 'لا يوجد تدريب بعد'}</small></span>
            </button>
            <button className="start-training-button" type="button" onClick={startTraining}>
              <svg><use href="#icon-training"></use></svg><span>ابدأ التدريب</span>
            </button>
          </aside>

          <article className="hub-video-player">
            <div className="hub-video-stage">
              {currentLesson.video_id ? (
                <BunnyPlayer key={currentLesson.id} videoId={currentLesson.video_id} courseId={courseId!} sessionToken={sessionToken} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.55)' }}>
                  <svg style={{ width: 56, height: 56, marginBottom: 12 }} viewBox="0 0 32 32"><use href="#icon-video"></use></svg>
                  <p style={{ fontWeight: 700 }}>لم يُرفع فيديو لهذا الدرس بعد</p>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="lesson-content-surface" ref={contentSurfaceRef}>
          <div className="lesson-tabs" role="tablist" aria-label="محتوى الدرس">
            <button className={`lesson-tab${activeTab === 'summary' ? ' active' : ''}`} type="button" role="tab" aria-selected={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
              <svg viewBox="0 0 24 24"><path d="M4 5.2c3.2-.8 5.8-.2 8 1.6v12c-2.2-1.8-4.8-2.4-8-1.6zM20 5.2c-3.2-.8-5.8-.2-8 1.6v12c2.2-1.8 4.8-2.4 8-1.6z"></path></svg>ملخص الدرس
            </button>
            <button className={`lesson-tab${activeTab === 'files' ? ' active' : ''}`} type="button" role="tab" aria-selected={activeTab === 'files'} onClick={() => setActiveTab('files')}>
              <svg><use href="#icon-file"></use></svg>ملفات الدرس
            </button>
            <button className={`lesson-tab${activeTab === 'training' ? ' active' : ''}`} type="button" role="tab" aria-selected={activeTab === 'training'} onClick={() => setActiveTab('training')}>
              <svg><use href="#icon-training"></use></svg>التدريبات
            </button>
          </div>

          <div className={`tab-panel${activeTab === 'summary' ? ' active' : ''}`} data-panel="summary">
            <div className="lesson-summary">
              <h2>ملخص الدرس</h2>
              <ol>
                {summaryPoints.length > 0 ? summaryPoints.map((pt: string, i: number) => (
                  <li key={i}><span>{i + 1}</span><p>{pt}</p></li>
                )) : (
                  <li><span>•</span><p>لم يُضَف ملخص لهذا الدرس بعد.</p></li>
                )}
              </ol>
            </div>
            <aside className="next-actions">
              <h3>التالي</h3>
              {lessonFiles[0] && (
                <button type="button" onClick={() => setActiveTab('files')}>
                  <span className="pdf-icon">{lessonFiles[0].file_type === 'sheet' ? <svg><use href="#icon-file"></use></svg> : 'PDF'}</span>
                  <p><b>{lessonFiles[0].title}</b><small>{lessonFiles[0].size_label || ''}</small></p>
                  <svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"></path></svg>
                </button>
              )}
              {currentQuiz && (
                <button className="training-preview" type="button" onClick={() => setActiveTab('training')}>
                  <span className="training-preview-icon"><svg><use href="#icon-training"></use></svg></span>
                  <p><b>{fmtCount(questionCount, 'سؤال', 'أسئلة')}</b><small>{currentQuiz.time_limit_minutes ? `${currentQuiz.time_limit_minutes} دقيقة تقديرية` : 'وقت غير محدد'}</small></p>
                  <svg className="round-arrow" viewBox="0 0 24 24"><path d="m14 7-5 5 5 5"></path></svg>
                </button>
              )}
              {!lessonFiles[0] && !currentQuiz && <p style={{ color: '#9c90a2', fontSize: 12 }}>لا توجد إجراءات تالية لهذا الدرس بعد.</p>}
            </aside>
          </div>

          <div className={`tab-panel${activeTab === 'files' ? ' active' : ''}`} data-panel="files">
            <div className="files-panel-head">
              <div><h2>ملفات الدرس</h2><p>كل ما تحتاجه للمراجعة بعد مشاهدة الفيديو.</p></div>
              <span>{lessonFiles.length ? fmtCount(lessonFiles.length, 'ملف جاهز', 'ملفات جاهزة') : 'لا توجد ملفات'}</span>
            </div>
            <div className="file-list">
              {lessonFiles.map((f: any) => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer" download>
                  {f.file_type === 'sheet' ? (
                    <span className="sheet-icon"><svg><use href="#icon-file"></use></svg></span>
                  ) : (
                    <span className="pdf-icon">PDF</span>
                  )}
                  <p><b>{f.title}</b><small>{f.size_label || ''}</small></p>
                  <em>تحميل</em>
                </a>
              ))}
              {!lessonFiles.length && <p style={{ color: '#9c90a2', fontSize: 13, gridColumn: '1/-1' }}>لم تُرفع ملفات لهذا الدرس بعد.</p>}
            </div>
          </div>

          <div className={`tab-panel${activeTab === 'training' ? ' active' : ''}`} data-panel="training">
            {currentQuiz ? (
              <>
                <div className="training-panel-copy">
                  <span className="large-training-icon"><svg><use href="#icon-training"></use></svg></span>
                  <div>
                    <h2>{currentQuiz.title}</h2>
                    <p>{fmtCount(questionCount, 'سؤال متدرج', 'أسئلة متدرجة')} تساعدك على تثبيت ما تعلمته في الدرس.</p>
                    <ul>
                      <li>{currentQuiz.time_limit_minutes ? `${currentQuiz.time_limit_minutes} دقيقة تقريبًا` : 'بدون حد زمني'}</li>
                      <li>نتيجة فورية</li>
                      <li>شرح الإجابات</li>
                    </ul>
                  </div>
                </div>
                <Link className="training-panel-button" to={`/quiz/${currentQuiz.id}`}>
                  <svg><use href="#icon-training"></use></svg>{quizPassed ? 'راجع التدريب' : 'ابدأ التدريب الآن'}
                </Link>
              </>
            ) : (
              <p style={{ color: '#9c90a2' }}>لا يوجد تدريب لهذا الدرس بعد.</p>
            )}
          </div>
        </section>
      </main>

      <aside className={`course-drawer${drawerOpen ? ' open' : ''}`} aria-label="محتوى الكورس">
        <header>
          <div><h2>{chapter ? 'محتوى الباب' : 'محتوى الكورس'}</h2><p>{chapter ? chapter.title : course?.title}</p></div>
          <button type="button" aria-label="إغلاق" onClick={() => setDrawerOpen(false)}>
            <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"></path></svg>
          </button>
        </header>
        <div className="drawer-progress">
          <span style={{ background: `conic-gradient(#7633d8 0 ${progressPct}%,#eee9f3 ${progressPct}%)` }}><i></i></span>
          <p><b>{progressPct}%</b><small>{completedCount} من {fmtCount(lessons.length, 'درس', 'درسًا')}</small></p>
        </div>
        <div className="drawer-lessons">
          {lessons.map((lesson: any, i: number) => {
            const isCompleted = progress[lesson.id]
            const isCurrent = currentLesson?.id === lesson.id
            const isNotEnrolled = !enrolled && !lesson.is_free_preview
            const isQuizBlocked = isBlockedByQuiz(i)
            const isLocked = isNotEnrolled || isQuizBlocked
            const stateClass = isCurrent ? 'current' : isCompleted ? 'done' : isLocked ? 'locked' : ''
            return (
              <button
                key={lesson.id}
                className={stateClass}
                disabled={isLocked}
                onClick={() => {
                  if (isLocked) return
                  setCurrentLesson(lesson)
                  setDrawerOpen(false)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <span>{isCompleted ? '✓' : isCurrent ? '▶' : isLocked ? '⌁' : i + 1}</span>
                <p><b>{lesson.title}</b><small>{isCompleted ? 'مكتمل' : isCurrent ? 'تشاهد الآن' : isQuizBlocked ? 'اجتز اختبار الدرس السابق' : isLocked ? 'مغلق' : lesson.duration_minutes ? `${lesson.duration_minutes} دقيقة` : 'مدة غير محددة'}</small></p>
              </button>
            )
          })}
        </div>
      </aside>
      <div className={`drawer-overlay${drawerOpen ? ' show' : ''}`} onClick={() => setDrawerOpen(false)} />

      <div className={`lesson-toast${toast.show ? ' show' : ''}`} role="status" aria-live="polite">
        <span>✓</span><p><b>{toast.title}</b><small>{toast.text}</small></p>
      </div>
    </div>
  )
}
