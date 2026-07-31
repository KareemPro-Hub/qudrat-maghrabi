export type StorePlatform = 'apple' | 'google'

export type SubscriptionStatus =
  | 'active'
  | 'grace'
  | 'cancelled'
  | 'expired'
  | 'revoked'
  | 'paused'
  | 'pending'

export type VerifiedStoreSubscription = {
  platform: StorePlatform
  productId: string
  originalTransactionId: string
  latestTransactionId: string
  status: SubscriptionStatus
  purchasedAt: string
  periodStart: string
  periodEnd: string
  autoRenew: boolean
  appAccountToken?: string
  rawState: string
}

export class StoreConfigurationError extends Error {}
export class StoreVerificationError extends Error {}

const APPLE_PRODUCTION_API = 'https://api.storekit.itunes.apple.com'
const APPLE_SANDBOX_API = 'https://api.storekit-sandbox.itunes.apple.com'
const GOOGLE_ANDROID_PUBLISHER_SCOPE =
  'https://www.googleapis.com/auth/androidpublisher'

function textToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function base64UrlEncode(value: Uint8Array | string): string {
  const bytes = typeof value === 'string' ? textToBytes(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) {
    throw new StoreVerificationError('Malformed signed store payload')
  }
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])))
  } catch {
    throw new StoreVerificationError('Could not decode signed store payload')
  }
}

function pemToDer(pem: string): Uint8Array {
  const normalized = pem.replaceAll('\\n', '\n')
  const base64 = normalized
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '')
  if (!base64) throw new StoreConfigurationError('Invalid store private key')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

async function createAppleApiToken(): Promise<string> {
  const issuerId = Deno.env.get('APPLE_IAP_ISSUER_ID')?.trim()
  const keyId = Deno.env.get('APPLE_IAP_KEY_ID')?.trim()
  const privateKey = Deno.env.get('APPLE_IAP_PRIVATE_KEY')
  const bundleId =
    Deno.env.get('APPLE_BUNDLE_ID')?.trim() || 'com.qudratmaghrabi.app'
  if (!issuerId || !keyId || !privateKey) {
    throw new StoreConfigurationError('Apple subscription secrets are missing')
  }

  const now = Math.floor(Date.now() / 1000)
  const encodedHeader = base64UrlEncode(
    JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }),
  )
  const encodedPayload = base64UrlEncode(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 15 * 60,
      aud: 'appstoreconnect-v1',
      bid: bundleId,
    }),
  )
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    textToBytes(unsignedToken),
  )
  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`
}

function toIsoDate(value: unknown, field: string): string {
  const date = typeof value === 'number'
    ? new Date(value)
    : new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) {
    throw new StoreVerificationError(`Store response is missing ${field}`)
  }
  return date.toISOString()
}

async function fetchAppleSubscription(
  apiBase: string,
  transactionId: string,
  token: string,
): Promise<Response> {
  return fetch(
    `${apiBase}/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  )
}

export async function verifyAppleSubscription(
  transactionId: string,
  expectedProductId?: string,
): Promise<VerifiedStoreSubscription> {
  if (!/^[A-Za-z0-9._-]{3,200}$/.test(transactionId)) {
    throw new StoreVerificationError('Invalid Apple transaction identifier')
  }
  const token = await createAppleApiToken()
  let response = await fetchAppleSubscription(
    APPLE_PRODUCTION_API,
    transactionId,
    token,
  )
  if (!response.ok) {
    response = await fetchAppleSubscription(
      APPLE_SANDBOX_API,
      transactionId,
      token,
    )
  }
  if (!response.ok) {
    const message = await response.text()
    console.error('Apple subscription verification failed', {
      status: response.status,
      message: message.slice(0, 500),
    })
    throw new StoreVerificationError('Apple could not verify this subscription')
  }

  const body = await response.json()
  const transactions = (Array.isArray(body?.data) ? body.data : [])
    .flatMap((group: Record<string, unknown>) =>
      Array.isArray(group?.lastTransactions) ? group.lastTransactions : []
    ) as Array<Record<string, unknown>>
  const decoded = transactions.map((entry) => ({
    entry,
    transaction: decodeJwtPayload(String(entry.signedTransactionInfo ?? '')),
    renewal: entry.signedRenewalInfo
      ? decodeJwtPayload(String(entry.signedRenewalInfo))
      : {},
  }))
  const selected = decoded.find(
    (item) =>
      !expectedProductId || item.transaction.productId === expectedProductId,
  ) ?? decoded[0]
  if (!selected) {
    throw new StoreVerificationError('Apple returned no subscription transaction')
  }

  const configuredBundle =
    Deno.env.get('APPLE_BUNDLE_ID')?.trim() || 'com.qudratmaghrabi.app'
  const productId = String(selected.transaction.productId ?? '')
  if (selected.transaction.bundleId !== configuredBundle) {
    throw new StoreVerificationError('Apple transaction belongs to another app')
  }
  if (expectedProductId && productId !== expectedProductId) {
    throw new StoreVerificationError('Apple product does not match the request')
  }

  const periodEnd = toIsoDate(selected.transaction.expiresDate, 'expiresDate')
  const periodStart = toIsoDate(
    selected.transaction.purchaseDate ?? selected.transaction.originalPurchaseDate,
    'purchaseDate',
  )
  const purchasedAt = toIsoDate(
    selected.transaction.originalPurchaseDate ?? selected.transaction.purchaseDate,
    'originalPurchaseDate',
  )
  const rawStatus = Number(selected.entry.status)
  const autoRenew = Number(selected.renewal.autoRenewStatus) === 1
  const stillEntitled = new Date(periodEnd).getTime() > Date.now()
  let status: SubscriptionStatus = 'pending'
  if (selected.transaction.revocationDate || rawStatus === 5) status = 'revoked'
  else if (rawStatus === 4) status = stillEntitled ? 'grace' : 'expired'
  else if (rawStatus === 3) status = stillEntitled ? 'grace' : 'expired'
  else if (rawStatus === 2) status = 'expired'
  else if (rawStatus === 1) status = autoRenew ? 'active' : 'cancelled'
  else if (!stillEntitled) status = 'expired'

  return {
    platform: 'apple',
    productId,
    originalTransactionId: String(
      selected.transaction.originalTransactionId ?? '',
    ),
    latestTransactionId: String(selected.transaction.transactionId ?? ''),
    status,
    purchasedAt,
    periodStart,
    periodEnd,
    autoRenew,
    appAccountToken: selected.transaction.appAccountToken
      ? String(selected.transaction.appAccountToken)
      : undefined,
    rawState: String(rawStatus),
  }
}

type GoogleServiceAccount = {
  client_email?: string
  private_key?: string
  token_uri?: string
}

async function createGoogleAccessToken(): Promise<string> {
  const rawServiceAccount = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')
  if (!rawServiceAccount) {
    throw new StoreConfigurationError('Google Play subscription secret is missing')
  }
  let serviceAccount: GoogleServiceAccount
  try {
    serviceAccount = JSON.parse(rawServiceAccount)
  } catch {
    throw new StoreConfigurationError('Google Play service account is invalid')
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new StoreConfigurationError('Google Play service account is incomplete')
  }

  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token'
  const now = Math.floor(Date.now() / 1000)
  const encodedHeader = base64UrlEncode(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  )
  const encodedPayload = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: GOOGLE_ANDROID_PUBLISHER_SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 60 * 60,
    }),
  )
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    signingKey,
    textToBytes(unsignedToken),
  )
  const assertion = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!response.ok) {
    console.error('Google OAuth failed', response.status, await response.text())
    throw new StoreVerificationError('Could not authenticate with Google Play')
  }
  const body = await response.json()
  if (!body?.access_token) {
    throw new StoreVerificationError('Google did not return an access token')
  }
  return String(body.access_token)
}

export async function verifyGoogleSubscription(
  purchaseToken: string,
  expectedProductId?: string,
): Promise<VerifiedStoreSubscription> {
  if (!purchaseToken || purchaseToken.length > 4096) {
    throw new StoreVerificationError('Invalid Google Play purchase token')
  }
  const packageName =
    Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME')?.trim() ||
    'com.qudratmaghrabi.app'
  const accessToken = await createGoogleAccessToken()
  const response = await fetch(
    'https://androidpublisher.googleapis.com/androidpublisher/v3/' +
      `applications/${encodeURIComponent(packageName)}/purchases/` +
      `subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  )
  if (!response.ok) {
    console.error(
      'Google subscription verification failed',
      response.status,
      (await response.text()).slice(0, 500),
    )
    throw new StoreVerificationError('Google Play could not verify this subscription')
  }

  const body = await response.json()
  const lineItems = Array.isArray(body?.lineItems) ? body.lineItems : []
  const line = lineItems.find(
    (item: Record<string, unknown>) =>
      !expectedProductId || item.productId === expectedProductId,
  ) ?? lineItems[0]
  if (!line) {
    throw new StoreVerificationError('Google returned no subscription line item')
  }
  const productId = String(line.productId ?? '')
  if (expectedProductId && productId !== expectedProductId) {
    throw new StoreVerificationError('Google product does not match the request')
  }

  const rawState = String(body.subscriptionState ?? '')
  const autoRenew = line.autoRenewingPlan?.autoRenewEnabled === true
  const periodEnd = toIsoDate(line.expiryTime, 'expiryTime')
  const periodStart = toIsoDate(body.startTime, 'startTime')
  let status: SubscriptionStatus = 'pending'
  switch (rawState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      status = autoRenew ? 'active' : 'cancelled'
      break
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      status = 'grace'
      break
    case 'SUBSCRIPTION_STATE_CANCELED':
      status = 'cancelled'
      break
    case 'SUBSCRIPTION_STATE_EXPIRED':
      status = 'expired'
      break
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PAUSED':
      status = 'paused'
      break
  }
  if (new Date(periodEnd).getTime() <= Date.now() && status !== 'revoked') {
    status = 'expired'
  }

  return {
    platform: 'google',
    productId,
    originalTransactionId: purchaseToken,
    latestTransactionId: String(
      body.latestOrderId ?? line.latestSuccessfulOrderId ?? purchaseToken,
    ),
    status,
    purchasedAt: periodStart,
    periodStart,
    periodEnd,
    autoRenew,
    rawState,
  }
}

export function isEntitled(subscription: VerifiedStoreSubscription): boolean {
  return ['active', 'grace', 'cancelled'].includes(subscription.status) &&
    new Date(subscription.periodEnd).getTime() > Date.now()
}
