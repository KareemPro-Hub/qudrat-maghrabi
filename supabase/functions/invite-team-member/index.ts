import { createClient } from 'npm:@supabase/supabase-js@2.106.2'

const ALLOWED_ROLES = new Set([
  'teacher',
  'content_manager',
  'student_manager',
  'quiz_manager',
])
const REDIRECT_TO = 'https://qudrat-maghrabi.vercel.app/reset-password'

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
    const role = String(body?.role ?? '').trim()

    if (!email || !fullName || !role) {
      return json({ error: 'البريد الإلكتروني والاسم والدور مطلوبون' }, 400)
    }
    if (!isEmail(email)) {
      return json({ error: 'البريد الإلكتروني غير صالح' }, 400)
    }
    if (!ALLOWED_ROLES.has(role)) {
      return json({ error: 'دور غير صالح' }, 400)
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
    if (callerProfile.role !== 'admin') {
      return json({ error: 'غير مصرح لك بإضافة أعضاء فريق' }, 403)
    }

    let memberId: string | null = null
    let inviteLink: string | null = null
    let existing = false

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { role, full_name: fullName },
        redirectTo: REDIRECT_TO,
      },
    })

    if (!inviteError && invited.user && invited.properties?.action_link) {
      memberId = invited.user.id
      inviteLink = invited.properties.action_link
    } else {
      // generateLink(type: 'invite') rejects registered users. A recovery link
      // lets an admin reissue access without deleting or recreating the account.
      const { data: recovered, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: REDIRECT_TO },
      })

      if (recoveryError || !recovered.user || !recovered.properties?.action_link) {
        console.error('Could not generate team invite link', { inviteError, recoveryError })
        return json({ error: 'تعذّر إنشاء رابط الدعوة. حاول مرة أخرى.' }, 400)
      }

      existing = true
      memberId = recovered.user.id
      inviteLink = recovered.properties.action_link
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: memberId,
        email,
        full_name: fullName,
        role,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Could not save invited team profile', profileError)
      return json({ error: 'تم إنشاء الحساب لكن تعذّر حفظ دوره. حاول مرة أخرى.' }, 500)
    }

    return json({
      success: true,
      existing,
      invite_link: inviteLink,
    })
  } catch (error) {
    console.error('Unexpected invite-team-member error', error)
    return json({ error: 'حدث خطأ غير متوقع. حاول مرة أخرى.' }, 500)
  }
})
