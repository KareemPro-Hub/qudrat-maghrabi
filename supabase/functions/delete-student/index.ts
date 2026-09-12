import { createClient } from 'npm:@supabase/supabase-js@2.106.2'

const ALLOWED_CALLER_ROLES = new Set(['admin', 'student_manager'])

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد' }, 401)
    }

    const body = await req.json()
    const studentId = String(body?.student_id ?? '').trim()
    if (!UUID_RE.test(studentId)) {
      return json({ error: 'معرّف الطالب غير صالح' }, 400)
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
      return json({ error: 'غير مصرح لك بحذف الطلاب' }, 403)
    }

    // لا يحذف أحد حسابه من هنا — لذلك مسار مستقل داخل التطبيق.
    if (studentId === user.id) {
      return json({ error: 'لا يمكنك حذف حسابك من هذه الصفحة' }, 400)
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', studentId)
      .maybeSingle()

    if (targetError) {
      console.error('Could not load target profile', targetError)
      return json({ error: 'تعذّر قراءة بيانات الطالب' }, 500)
    }
    if (!target) {
      return json({ error: 'الحساب غير موجود أو محذوف بالفعل' }, 404)
    }
    // حارس صارم: هذه الصفحة للطلاب فقط. حسابات الإدارة وفريق العمل تُدار من
    // صفحة الفريق حتى لا يُحذف حساب إداري بالخطأ من قائمة الطلاب.
    if (target.role !== 'student') {
      return json({ error: 'هذا الحساب ليس حساب طالب ولا يُحذف من هنا' }, 403)
    }

    // محتوى منشور مرتبط بالحساب يمنع الحذف (نفس شرط delete_my_account):
    // courses.created_by يمنع الحذف على مستوى القاعدة (NO ACTION)، والباقي
    // كان سيُفرَّغ بصمت فنمنعه صراحةً بدل فقدان نسبة المحتوى.
    const [courses, questions, discounts] = await Promise.all([
      supabaseAdmin.from('courses').select('id', { count: 'exact', head: true }).eq('created_by', studentId),
      supabaseAdmin.from('quiz_questions').select('id', { count: 'exact', head: true }).eq('created_by', studentId),
      supabaseAdmin.from('discount_codes').select('id', { count: 'exact', head: true }).eq('created_by', studentId),
    ])
    const ownedContent = (courses.count ?? 0) + (questions.count ?? 0) + (discounts.count ?? 0)
    if (ownedContent > 0) {
      return json({ error: 'الحساب مرتبط بمحتوى منشور على المنصة ولا يمكن حذفه' }, 409)
    }

    // إحصاء ما سيُحذف تِبَعًا (ON DELETE CASCADE عبر profiles) للسجل فقط.
    const [enrollments, results, progress, subscriptions] = await Promise.all([
      supabaseAdmin.from('enrollments').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
      supabaseAdmin.from('quiz_results').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
      supabaseAdmin.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
      supabaseAdmin.from('store_subscriptions').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
    ])

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(studentId)
    if (deleteError) {
      console.error('Could not delete student user', deleteError)
      return json({ error: 'تعذّر حذف الحساب. حاول مرة أخرى.' }, 500)
    }

    // تحقق فعلي بعد الحذف: صف profiles يُحذف تِبَعًا لمفتاح
    // profiles_id_fkey (ON DELETE CASCADE)، ومنه تُحذف بقية بيانات الطالب.
    const { data: leftover } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', studentId)
      .maybeSingle()

    if (leftover) {
      console.error('Profile row survived auth user deletion', studentId)
      return json({ error: 'حُذف الحساب لكن بقيت بيانات مرتبطة به. تواصل مع الدعم.' }, 500)
    }

    console.log('Student deleted', {
      by: user.id,
      student: studentId,
      email: target.email,
      enrollments: enrollments.count ?? 0,
      quiz_results: results.count ?? 0,
      lesson_progress: progress.count ?? 0,
      store_subscriptions: subscriptions.count ?? 0,
    })

    return json({
      success: true,
      deleted: {
        enrollments: enrollments.count ?? 0,
        quiz_results: results.count ?? 0,
        lesson_progress: progress.count ?? 0,
        store_subscriptions: subscriptions.count ?? 0,
      },
    })
  } catch (error) {
    console.error('Unexpected delete-student error', error)
    return json({ error: 'حدث خطأ غير متوقع. حاول مرة أخرى.' }, 500)
  }
})
