import { createClient } from 'npm:@supabase/supabase-js@2.106.2'
import { createResetHandler } from './handler.ts'

Deno.serve(createResetHandler(() => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Service configuration unavailable')
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  return {
    async getUser(token) {
      const { data, error } = await admin.auth.getUser(token)
      return error ? null : data.user
    },
    async getProfile(id) {
      const { data, error } = await admin.from('profiles').select('role, is_active').eq('id', id).maybeSingle()
      if (error) throw new Error('Profile lookup failed')
      return data
    },
    async updatePassword(id, password) {
      const { data, error } = await admin.auth.admin.updateUserById(id, { password })
      return { success: !error && data.user?.id === id, weakPassword: error?.code === 'weak_password' }
    },
  }
}))
