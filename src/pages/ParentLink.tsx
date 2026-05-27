import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function ParentLink() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)

  async function searchStudent() {
    if (!email) return toast.error('أدخل البريد الإلكتروني')
    setSearching(true)
    setFound(null)

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('email', email.trim())
      .eq('role', 'student')
      .single()

    if (!data) {
      toast.error('لم يتم العثور على طالب بهذا البريد')
    } else {
      setFound(data)
    }
    setSearching(false)
  }

  async function linkStudent() {
    if (!found || !user) return
    setLinking(true)

    const { error } = await supabase
      .from('parent_student')
      .insert({ parent_id: user.id, student_id: found.id })

    if (error?.code === '23505') {
      toast.error('هذا الطالب مرتبط بحسابك بالفعل')
    } else if (error) {
      toast.error('حدث خطأ، حاول مجدداً')
    } else {
      toast.success(`تم ربط حسابك بـ ${found.full_name} ✅`)
      navigate('/parent')
    }
    setLinking(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{background: 'linear-gradient(135deg, #1B1B5E 0%, #3D1070 100%)'}}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-brand-lg p-8">

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus size={32} className="text-brand-purple" />
            </div>
            <h1 className="text-2xl font-black text-brand-navy">ربط حساب الطالب</h1>
            <p className="text-gray-500 text-sm mt-1">أدخل البريد الإلكتروني لابنك/ابنتك</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-2">البريد الإلكتروني للطالب</label>
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchStudent()}
                  placeholder="student@email.com"
                  className="input-field pr-10"
                  dir="ltr"
                />
              </div>
            </div>

            <button onClick={searchStudent} disabled={searching} className="btn-outline w-full py-3">
              {searching ? 'جاري البحث...' : 'بحث عن الطالب'}
            </button>

            {/* Found Student */}
            {found && (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white font-black text-lg">
                    {found.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-brand-navy">{found.full_name}</p>
                    <p className="text-gray-400 text-sm">{found.email}</p>
                  </div>
                  <CheckCircle size={20} className="text-green-500" />
                </div>

                <button onClick={linkStudent} disabled={linking} className="btn-primary w-full py-3 mt-4">
                  {linking ? 'جاري الربط...' : `ربط بـ ${found.full_name}`}
                </button>
              </div>
            )}

            <p className="text-center text-xs text-gray-400">
              يجب أن يكون الطالب مسجلاً في المنصة أولاً
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
