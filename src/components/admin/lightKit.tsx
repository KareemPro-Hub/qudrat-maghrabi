import { ReactNode, useEffect, useId } from 'react'
import { X } from 'lucide-react'

export function SectionToolbar({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="section-toolbar">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action}
    </div>
  )
}

export function StatusBadge({ variant, children }: { variant: 'success' | 'warning' | 'danger' | 'neutral'; children: ReactNode }) {
  return <span className={`status ${variant}`}>{children}</span>
}

export function TagBadge({ variant, children }: { variant: 'purple' | 'orange' | 'pink'; children: ReactNode }) {
  return <span className={`tag ${variant}`}>{children}</span>
}

export function Spinner() {
  return <div className="adm-loading"><i /></div>
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      {action}
    </div>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const titleId = useId()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div className="adm-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`adm-modal${wide ? ' wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="adm-modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="adm-modal-close" onClick={onClose} aria-label="إغلاق النافذة">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="adm-modal-body">{children}</div>
      </div>
    </div>
  )
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <article className="admin-card data-card"><div className="table-wrap">{children}</div></article>
}

export function initials(name?: string) {
  return name?.charAt(0) || '؟'
}

export const avatarPalette = ['a1', 'a2', 'a3', 'a4', 'a5']
export function avatarClass(seed: number) {
  return avatarPalette[seed % avatarPalette.length]
}
