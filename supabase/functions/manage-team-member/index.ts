import { createClient } from 'npm:@supabase/supabase-js@2.106.2'

const MANAGEABLE_ROLES = new Set([
  'teacher',
  'content_manager',
  'student_manager',
  'quiz_manager',
])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد' }, 401)
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
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)
    if (callerError || !caller) {
      return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد' }, 401)
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfileError) {
      console.error('Could not load caller profile', callerProfileError)
      return json({ error: 'تعذّر التحقق من صلاحيات الحساب' }, 500)
    }
    if (callerProfile.role !== 'admin') {
      return json({ error: 'غير مصرح لك بإدارة أعضاء الفريق' }, 403)
    }

    const body = await req.json()
    const action = String(body?.action ?? '').trim()
    const memberId = String(body?.member_id ?? '').trim()
    const role = String(body?.role ?? '').trim()

    if (!UUID_PATTERN.test(memberId)) {
      return json({ error: 'معرّف العضو غير صالح' }, 400)
    }
    if (memberId === caller.id) {
      return json({ error: 'لا يمكنك تعديل حساب مدير المنصة من هنا' }, 403)
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return json({ error: 'العضو غير موجود أو تم حذفه بالفعل' }, 404)
    }
    if (member.role === 'admin') {
      return json({ error: 'حساب مدير المنصة محمي من التعديل والحذف' }, 403)
    }

    if (action === 'update_role') {
      if (!MANAGEABLE_ROLES.has(role)) {
        return json({ error: 'الدور المحدد غير صالح' }, 400)
      }

      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(memberId)
      if (authUserError || !authUser.user) {
        console.error('Could not load member auth account', authUserError)
        return json({ error: 'تعذّر العثور على حساب تسجيل دخول العضو' }, 404)
      }

      const oldAppMetadata = authUser.user.app_metadata ?? {}
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(memberId, {
        app_metadata: { ...oldAppMetadata, role },
      })
      if (authUpdateError) {
        console.error('Could not update member app metadata', authUpdateError)
        return json({ error: 'تعذّر تحديث صلاحيات تسجيل الدخول' }, 500)
      }

      const { data: updatedMember, error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('id', memberId)
        .select('id, full_name, email, role')
        .single()

      if (profileUpdateError || !updatedMember) {
        const { error: rollbackError } = await supabaseAdmin.auth.admin.updateUserById(memberId, {
          app_metadata: oldAppMetadata,
        })
        console.error('Could not update member profile role', { profileUpdateError, rollbackError })
        return json({ error: 'تعذّر حفظ الصلاحيات الجديدة' }, 500)
      }

      return json({ success: true, action, member: updatedMember })
    }

    if (action === 'delete') {
      const { count: ownedCourses, error: coursesError } = await supabaseAdmin
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', memberId)

      if (coursesError) {
        console.error('Could not check member-owned courses', coursesError)
        return json({ error: 'تعذّر التحقق من محتوى العضو قبل الحذف' }, 500)
      }
      if ((ownedCourses ?? 0) > 0) {
        return json({ error: 'لا يمكن حذف العضو قبل نقل الكورسات المملوكة له إلى عضو آخر' }, 409)
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(memberId)
      if (deleteError) {
        console.error('Could not delete team member', deleteError)
        return json({ error: 'تعذّر حذف العضو. تأكد أنه لا يملك ملفات أو محتوى مرتبطًا.' }, 400)
      }

      return json({ success: true, action, member_id: memberId })
    }

    return json({ error: 'الإجراء المطلوب غير صالح' }, 400)
  } catch (error) {
    console.error('Unexpected manage-team-member error', error)
    return json({ error: 'حدث خطأ غير متوقع. حاول مرة أخرى.' }, 500)
  }
})
