type Profile = { role: string; is_active: boolean | null }
export type ResetDependencies = {
  getUser: (token: string) => Promise<{ id: string } | null>
  getProfile: (id: string) => Promise<Profile | null>
  updatePassword: (id: string, password: string) => Promise<{ success: boolean; weakPassword?: boolean }>
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const allowedRoles = new Set(['admin', 'student_manager'])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export function createResetHandler(createDependencies: () => ResetDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const authorization = req.headers.get('Authorization') ?? ''
    if (!authorization.startsWith('Bearer ') || !authorization.slice(7).trim()) {
      return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد' }, 401)
    }
    try {
      const dependencies = createDependencies()
      const caller = await dependencies.getUser(authorization.slice(7))
      if (!caller) return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد' }, 401)
      const callerProfile = await dependencies.getProfile(caller.id)
      if (!callerProfile || callerProfile.is_active === false || !allowedRoles.has(callerProfile.role)) {
        return json({ error: 'غير مصرح لك بتغيير كلمات مرور الطلاب' }, 403)
      }
      let body: unknown
      try { body = await req.json() } catch { return json({ error: 'الطلب غير صالح' }, 400) }
      const input = body as { student_id?: unknown; password?: unknown } | null
      if (typeof input?.student_id !== 'string' || !uuid.test(input.student_id)) {
        return json({ error: 'معرّف الطالب غير صالح' }, 400)
      }
      if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128) {
        return json({ error: 'كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا' }, 400)
      }
      if (input.student_id === caller.id) return json({ error: 'غيّر كلمة مرورك من إعدادات حسابك' }, 403)
      const target = await dependencies.getProfile(input.student_id)
      if (!target) return json({ error: 'حساب الطالب غير موجود' }, 404)
      if (target.role !== 'student') return json({ error: 'هذا الحساب ليس حساب طالب' }, 403)
      // Only update the existing Auth user's password; preserve ID, profile and all related data.
      const result = await dependencies.updatePassword(input.student_id, input.password)
      if (!result.success) {
        return json({ error: result.weakPassword ? 'اختر كلمة مرور أقوى أو استخدم زر التوليد' : 'تعذّر تغيير كلمة المرور. حاول مجددًا' }, result.weakPassword ? 400 : 502)
      }
      return json({ success: true, student_id: input.student_id })
    } catch {
      // Never include credentials or raw Auth/database errors in responses or logs.
      return json({ error: 'تعذّر تغيير كلمة المرور. حاول مجددًا' }, 500)
    }
  }
}
