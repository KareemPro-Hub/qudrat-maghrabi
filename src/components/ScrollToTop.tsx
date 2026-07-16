import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// يضمن إن أي انتقال بين الصفحات (تقدم أو رجوع بالمتصفح) يبدأ من أول الصفحة،
// إلا لو الرابط فيه # (روابط الأقسام في الصفحة الرئيسية) بتفضل بتعمل scroll للقسم نفسه.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
