import type { LucideIcon } from 'lucide-react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="role-page-header">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="role-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="text-sm md:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="ui-empty">
      <Icon aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="ui-loading" role="status" aria-label={label}>
      <div className="ui-spinner" />
    </div>
  )
}

const STATUS_TONE: Record<string, string> = {
  LIVE: 'is-live',
  ACTIVE: 'is-success',
  APPROVED: 'is-success',
  PUBLISHED: 'is-success',
  PASSED: 'is-success',
  EVALUATED: 'is-success',
  SUBMITTED: 'is-info',
  COMPLETED: 'is-neutral',
  SCHEDULED: 'is-warning',
  PENDING: 'is-warning',
  PENDING_APPROVAL: 'is-warning',
  IN_PROGRESS: 'is-accent',
  DRAFT: 'is-neutral',
  REJECTED: 'is-danger',
  FAILED: 'is-danger',
  INACTIVE: 'is-danger',
  CANCELLED: 'is-danger',
}

export function StatusBadge({ status, label }: { status?: string; label?: string }) {
  const key = String(status || '').toUpperCase()
  const text = label || key.replace(/_/g, ' ').toLowerCase()
  return <span className={`ui-badge ${STATUS_TONE[key] || 'is-neutral'}`}>{text}</span>
}

export function Stat({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  hint?: React.ReactNode
  tone?: 'gold' | 'success' | 'danger' | 'warning'
}) {
  return (
    <div className="ui-stat">
      <div className="ui-stat-top">
        <span className="ui-stat-label">{label}</span>
        {Icon && <span className={`ui-icon-tile${tone ? ` is-${tone}` : ''}`} style={{ width: 34, height: 34 }}><Icon aria-hidden="true" /></span>}
      </div>
      <span className="ui-stat-value">{value}</span>
      {hint && <span className="ui-stat-hint">{hint}</span>}
    </div>
  )
}

export function initials(name?: string) {
  return (name || '').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '·'
}
