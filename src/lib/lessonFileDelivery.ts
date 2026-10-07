export const LESSON_FILES_BUCKET = 'lesson-files'
export const MAX_LESSON_FILE_BYTES = 50 * 1024 * 1024

export function lessonFileStoragePath(lessonId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file'
  return `${lessonId}/${crypto.randomUUID()}_${safeName}`
}

export async function assertLessonFileAvailable(fileUrl: string): Promise<void> {
  const url = new URL(fileUrl)
  // نفحص روابط الاستضافة التي تدعم CORS، دون تعطيل روابط المصادر الأخرى القديمة.
  const isCloudinary = url.hostname === 'res.cloudinary.com'
  const isLessonStorage = url.hostname.endsWith('.supabase.co')
    && url.pathname.startsWith(`/storage/v1/object/sign/${LESSON_FILES_BUCKET}/`)
  if (!isCloudinary && !isLessonStorage) return

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  let response: Response
  try {
    response = await fetch(url.href, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch {
    throw new Error('تعذّر التحقق من تنزيل الملف. أعد المحاولة؛ لم يتم حفظ الرابط.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok || response.headers.get('X-Cld-Error')) {
    throw new Error(response.status === 401 || response.status === 403
      ? 'استضافة الملف تمنع تنزيله. أعد رفع الملف قبل حفظه.'
      : 'رابط الملف لا يعمل. لم يتم حفظه؛ أعد رفع الملف وحاول مجددًا.')
  }
}
