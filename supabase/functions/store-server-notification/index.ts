import { createClient } from 'npm:@supabase/supabase-js@2.106.2'
import {
  decodeJwtPayload,
  StoreConfigurationError,
  StoreVerificationError,
  verifyAppleSubscription,
  verifyGoogleSubscription,
  type VerifiedStoreSubscription,
} from '../_shared/store_verification.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function decodeBase64Json(value: string): Record<string, unknown> {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    throw new StoreVerificationError('Malformed Google notification payload')
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing built-in Supabase environment variables')
      return json({ error: 'Service configuration is incomplete' }, 500)
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
    const body = await req.json()

    let verified: VerifiedStoreSubscription
    let eventType = 'unknown'
    let externalEventId: string | undefined
    if (typeof body?.signedPayload === 'string') {
      const outer = decodeJwtPayload(body.signedPayload)
      eventType = String(outer.notificationType ?? 'apple_notification')
      externalEventId = outer.notificationUUID
        ? String(outer.notificationUUID)
        : undefined
      if (eventType === 'TEST') {
        console.log('Accepted Apple test notification', { externalEventId })
        return json({ accepted: true, test: true })
      }
      const data = outer.data as Record<string, unknown> | undefined
      const signedTransaction = String(data?.signedTransactionInfo ?? '')
      const transaction = decodeJwtPayload(signedTransaction)
      const transactionId = String(transaction.transactionId ?? '')
      verified = await verifyAppleSubscription(transactionId)
    } else if (typeof body?.message?.data === 'string') {
      const message = decodeBase64Json(body.message.data)
      const subscriptionNotification = message.subscriptionNotification as
        | Record<string, unknown>
        | undefined
      const purchaseToken = String(
        subscriptionNotification?.purchaseToken ?? '',
      )
      const productId = subscriptionNotification?.subscriptionId
        ? String(subscriptionNotification.subscriptionId)
        : undefined
      verified = await verifyGoogleSubscription(purchaseToken, productId)
      eventType = subscriptionNotification?.notificationType
        ? `google_${subscriptionNotification.notificationType}`
        : 'google_notification'
      externalEventId = body.message.messageId
        ? String(body.message.messageId)
        : undefined
    } else {
      return json({ error: 'Unsupported store notification' }, 400)
    }

    const { data: existing, error: existingError } = await admin
      .from('store_subscriptions')
      .select('student_id')
      .eq('platform', verified.platform)
      .eq('original_transaction_id', verified.originalTransactionId)
      .maybeSingle()
    if (existingError) {
      console.error('Could not locate store subscription owner', existingError)
      return json({ error: 'Could not process notification' }, 500)
    }
    if (!existing?.student_id) {
      console.log('Ignoring verified notification for an unbound purchase', {
        platform: verified.platform,
        originalTransactionId: verified.originalTransactionId,
      })
      return json({ accepted: true, bound: false }, 202)
    }

    const { error: recordError } = await admin.rpc(
      'record_verified_store_subscription',
      {
        p_student_id: existing.student_id,
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
      console.error('Could not synchronize store notification', recordError)
      return json({ error: 'Could not synchronize subscription' }, 500)
    }

    const { error: auditError } = await admin.from('store_purchase_events').insert({
      platform: verified.platform,
      event_type: eventType,
      external_event_id: externalEventId,
      original_transaction_id: verified.originalTransactionId,
      payload: {
        product_id: verified.productId,
        status: verified.status,
        period_end: verified.periodEnd,
        auto_renew: verified.autoRenew,
      },
      processed: true,
      processed_at: new Date().toISOString(),
    })
    if (auditError && auditError.code !== '23505') {
      console.error('Could not save store notification audit event', auditError)
    }

    return json({ accepted: true, bound: true })
  } catch (error) {
    if (error instanceof StoreConfigurationError) {
      console.error('Store notification configuration error', error.message)
      return json({ error: 'Store configuration is incomplete' }, 503)
    }
    if (error instanceof StoreVerificationError) {
      console.error('Rejected unverified store notification', error.message)
      return json({ error: 'Store notification could not be verified' }, 400)
    }
    console.error('Unexpected store notification error', error)
    return json({ error: 'Unexpected notification error' }, 500)
  }
})
