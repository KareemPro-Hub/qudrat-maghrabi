import { createClient } from 'npm:@supabase/supabase-js@2.106.2'

const ALLOWED_CALLER_ROLES = new Set(['admin', 'student_manager'])
const PHONE_RE = /^\+[1-9]\d{7,14}$/

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد' }, 401)
    }

    const body = await req.json()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const fullName = String(body?.full_name ?? '').trim()
    const phone = String(body?.phone ?? '').trim()
    const password = String(body?.password ?? '')

    if (!email || !fullName || !phone || !password) {
      return json({ error: 'الاسم والبريد الإلكتروني ورقم الجوال وكلمة المرور مطلوبون' }, 400)
    }
    if (!isEmail(email)) {
      return json({ error: 'البريد الإلكتروني غير صالح' }, 400)
    }
    if (!PHONE_RE.test(phone)) {
      return json({ error: 'رقم الجوال غير صالح' }, 400)
    }
    if (password.length < 8) {
      return json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required Supabase environment variables')
      return json({ error: 'إعدادات الخدمة غير مكتملة' }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })

    const token = authHeader.slice('Bearer '.length)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد' }, 401)
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfileError) {
      console.error('Could not load caller profile', callerProfileError)
      return json({ error: 'تعذّر التحقق من صلاحيات الحساب' }, 500)
    }
    if (!ALLOWED_CALLER_ROLES.has(callerProfile.role)) {
      return json({ error: 'غير مصرح لك بإضافة طلاب' }, 403)
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, role: 'student' },
    })

    if (createError || !created.user) {
      const msg = String(createError?.message || '')
      console.error('Could not create student user', createError)
      if (/already.*registered|already exists/i.test(msg)) {
        return json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, 409)
      }
      return json({ error: 'تعذّر إنشاء الحساب. حاول مرة أخرى.' }, 400)
    }

    // شبكة أمان: التريجر public.handle_new_user يُنشئ صف profiles تلقائيًا،
    // لكن نتأكد بـ upsert دفاعي (بنفس نمط invite-team-member) تحسبًا لأي تأخير.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: created.user.id,
        email,
        full_name: fullName,
        phone,
        role: 'student',
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Could not upsert created student profile', profileError)
      return json({ error: 'تم إنشاء الحساب لكن تعذّر حفظ بياناته. راجع صفحة الطلاب.' }, 500)
    }

    return json({ success: true, user_id: created.user.id })
  } catch (error) {
    console.error('Unexpected create-student error', error)
    return json({ error: 'حدث خطأ غير متوقع. حاول مرة أخرى.' }, 500)
  }
})
