import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const keys = Object.keys(process.env).filter(
    (k) => k.includes('SUPABASE') || k.includes('SERVICE') || k.includes('BUNNY')
  )
  return res.status(200).json({
    keys,
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL),
  })
}
