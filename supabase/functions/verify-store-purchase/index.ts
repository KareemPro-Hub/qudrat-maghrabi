import { createClient } from 'npm:@supabase/supabase-js@2.106.2'
import {
  isEntitled,
  StoreConfigurationError,
  StoreVerificationError,
  verifyAppleSubscription,
  verifyGoogleSubscription,
} from '../_shared/store_verification.ts'

const PRODUCT_IDS = new Set([
  'com.qudratmaghrabi.app.subscription.monthly',
  'com.qudratmaghrabi.app.subscription.quarterly',
  'com.qudratmaghrabi.app.subscription.semiannual',
])

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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
      return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد.' }, 401)
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing built-in Supabase environment variables')
      return json({ error: 'إعدادات الخدمة غير مكتملة.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
    const token = authHeader.slice('Bearer '.length)
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token)
    if (userError || !user) {
      return json({ error: 'انتهت الجلسة، سجّل الدخول من جديد.' }, 401)
    }
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()
    if (profileError || profile?.role !== 'student' || !profile?.is_active) {
      return json({ error: 'الاشتراك متاح لحساب الطالب النشط فقط.' }, 403)
    }

    const body = await req.json()
    const platform = String(body?.platform ?? '').trim()
    const productId = String(body?.product_id ?? '').trim()
    const purchaseId = String(body?.purchase_id ?? '').trim()
    const serverVerificationData = String(
      body?.server_verification_data ?? '',
    ).trim()
    if (!PRODUCT_IDS.has(productId)) {
      return json({ error: 'باقة الاشتراك غير معروفة.' }, 400)
    }
    if (platform !== 'apple' && platform !== 'google') {
      return json({ error: 'متجر التطبيقات غير معروف.' }, 400)
    }

    const verified = platform === 'apple'
      ? await verifyAppleSubscription(purchaseId, productId)
      : await verifyGoogleSubscription(serverVerificationData, productId)

    if (
      verified.appAccountToken &&
      verified.appAccountToken.toLowerCase() !== user.id.toLowerCase()
    ) {
      return json(
        { error: 'عملية الشراء مرتبطة بحساب طالب آخر.' },
        409,
      )
    }

    const { data: subscriptionId, error: recordError } = await admin.rpc(
      'record_verified_store_subscription',
      {
        p_student_id: user.id,
        p_platform: verified.platform,
        p_product_id: verified.productId,
        p_original_transaction_id: verified.originalTransactionId,
        p_latest_transaction_id: verified.latestTransactionId,
        p_status: verified.status,
        p_purchased_at: verified.purchasedAt,
        p_period_start: verified.periodStart,
        p_period_end: verified.periodEnd,
        p_auto_renew: verified.autoRenew,
      },
    )
    if (recordError) {
      console.error('Could not record verified subscription', recordError)
      const linkedElsewhere = recordError.message?.includes(
        'already linked to another account',
      )
      return json(
        {
          error: linkedElsewhere
            ? 'عملية الشراء مستخدمة بالفعل مع حساب طالب آخر.'
            : 'تم التحقق من الدفع لكن تعذّر تفعيل الاشتراك. تواصل مع الدعم.',
        },
        linkedElsewhere ? 409 : 500,
      )
    }

    const entitled = isEntitled(verified)
    const { error: auditError } = await admin.from('store_purchase_events').insert({
      platform: verified.platform,
      event_type: 'client_verification',
      external_event_id: verified.latestTransactionId,
      original_transaction_id: verified.originalTransactionId,
      payload: {
        product_id: verified.productId,
        student_id: user.id,
        status: verified.status,
        period_end: verified.periodEnd,
      },
      processed: true,
      processed_at: new Date().toISOString(),
    })
    if (auditError && auditError.code !== '23505') {
      console.error('Could not save store purchase audit event', auditError)
    }

    return json({
      verified: true,
      entitled,
      subscription_id: subscriptionId,
      product_id: verified.productId,
      status: verified.status,
      expires_at: verified.periodEnd,
      auto_renew: verified.autoRenew,
    })
  } catch (error) {
    if (error instanceof StoreConfigurationError) {
      console.error('Store configuration error', error.message)
      return json(
        { error: 'منتجات المتجر قيد التجهيز ولم تُفعّل بعد.' },
        503,
      )
    }
    if (error instanceof StoreVerificationError) {
      console.error('Store verification rejected', error.message)
      return json({ error: 'تعذّر التحقق من عملية الشراء من المتجر.' }, 400)
    }
    console.error('Unexpected store purchase verification error', error)
    return json({ error: 'حدث خطأ غير متوقع أثناء التحقق من الاشتراك.' }, 500)
  }
})
