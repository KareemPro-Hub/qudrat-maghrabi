import { ReactNode } from 'react'
import { X } from 'lucide-react'

// Shared "Glass Pro" design-system primitives reused across every /admin/* page.
// Tokens match the approved handoff (Qudrat Dashboard Glass Pro.dc.html).

export const glassCard: React.CSSProperties = {
  borderRadius: 20,
  background: 'linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1.5px solid rgba(255,255,255,0.32)',
  borderBottomColor: 'rgba(255,255,255,0.10)',
  borderLeftColor: 'rgba(255,255,255,0.10)',
  boxShadow: '0 16px 40px rgba(10,5,40,0.35), inset 0 1px 1px rgba(255,255,255,0.4)',
  position: 'relative',
  overflow: 'hidden',
}

export function TopSheen() {
  return <span style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }} />
}

export const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  background: 'linear-gradient(135deg,#F97316,#EC4899 50%,#7C3AED)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 12,
  padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 10px 30px rgba(236,72,153,0.5), inset 0 1px 2px rgba(255,255,255,0.5)',
}

export const outlineBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.30)',
  color: '#fff', borderRadius: 12, padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)',
}

export const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.20)',
  borderRadius: 12, padding: '11px 14px', fontSize: 13.5, color: '#fff', outline: 'none',
}

export const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 8,
}

export function iconBtnStyle(danger?: boolean): React.CSSProperties {
  return {
    width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    color: danger ? '#FCA5A5' : 'rgba(255,255,255,0.65)', cursor: 'pointer', flexShrink: 0,
  }
}

type BadgeVariant = 'success' | 'neutral' | 'warning' | 'danger' | 'accent'

const badgeColors: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  success: { bg: 'rgba(34,197,94,0.15)', color: '#86EFAC', border: 'rgba(34,197,94,0.35)' },
  neutral: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.18)' },
  warning: { bg: 'rgba(234,179,8,0.15)', color: '#FDE68A', border: 'rgba(234,179,8,0.35)' },
  danger: { bg: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: 'rgba(239,68,68,0.35)' },
  accent: { bg: 'rgba(168,85,247,0.15)', color: '#D8B4FE', border: 'rgba(168,85,247,0.35)' },
}

export function GlassBadge({ children, variant = 'neutral' }: { children: ReactNode; variant?: BadgeVariant }) {
  const c = badgeColors[variant]
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {children}
    </span>
  )
}

export function GlassPageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 26 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>{title}</h1>
        {subtitle && <p style={{ margin: '5px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function GlassSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div className="animate-spin" style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.75)' }} />
    </div>
  )
}

export function GlassEmptyState({ icon, text, action }: { icon?: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="qm-glass" style={{ ...glassCard, padding: '56px 20px', textAlign: 'center' }}>
      <TopSheen />
      {icon && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, color: 'rgba(255,255,255,0.3)' }}>{icon}</div>}
      <p style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700, fontSize: 13.5, marginBottom: action ? 16 : 0 }}>{text}</p>
      {action}
    </div>
  )
}

export function GlassSearchInput({ value, onChange, placeholder, icon }: { value: string; onChange: (v: string) => void; placeholder: string; icon: ReactNode }) {
  return (
    <div style={{ position: 'relative', maxWidth: 380, marginBottom: 22 }}>
      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>{icon}</span>
      <input
        className="qm-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 40 }}
      />
    </div>
  )
}

export function GlassModal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,5,30,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div
        className="qm-glass"
        style={{
          width: '100%', maxWidth: wide ? 560 : 480, maxHeight: '90vh', overflowY: 'auto', borderRadius: 22,
          background: 'linear-gradient(160deg, rgba(40,26,90,0.85) 0%, rgba(35,22,80,0.9) 100%)',
          backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          border: '1.5px solid rgba(255,255,255,0.30)',
          boxShadow: '0 24px 70px rgba(10,5,40,0.55), inset 0 1px 1px rgba(255,255,255,0.35)',
          position: 'relative',
        }}
      >
        <TopSheen />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.12)', position: 'sticky', top: 0, background: 'rgba(30,20,65,0.6)', backdropFilter: 'blur(10px)', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  )
}

export const tableWrapStyle: React.CSSProperties = { ...glassCard, padding: 0 }
export const thStyle: React.CSSProperties = { textAlign: 'right', padding: '14px 18px', fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', borderBottom: '1px solid rgba(255,255,255,0.12)' }
export const tdStyle: React.CSSProperties = { padding: '14px 18px', fontSize: 13, color: 'rgba(255,255,255,0.85)' }
export const trStyle: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.07)' }
