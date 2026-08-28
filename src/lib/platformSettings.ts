import { supabase } from './supabase'

// إعدادات المنصة العامة (صف واحد في جدول platform_settings).
// أي فشل في القراءة بيرجع "الوضع الطبيعي" عشان عطل مؤقت في السيرفر
// ما يقفلش الموقع على الطلاب بالغلط.
export async function fetchMaintenanceMode(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('maintenance_mode')
      .maybeSingle()
    if (error) return false
    return data?.maintenance_mode === true
  } catch {
    return false
  }
}

export async function setMaintenanceMode(enabled: boolean) {
  return supabase
    .from('platform_settings')
    .update({ maintenance_mode: enabled, updated_at: new Date().toISOString() })
    .eq('id', true)
}
