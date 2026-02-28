'use client'

interface CapabilityTileProps {
  id: string
  slug: string
  name: string
  icon: string
  description_plain: string
  recent_count: number
  is_hot: boolean
  onClick: (slug: string) => void
}

function activityLabel(isHot: boolean, count: number): string {
  if (isHot) return 'HOT'
  if (count > 0) return 'AKTIV'
  return 'RUHIG'
}

function activityIcon(isHot: boolean, count: number): string {
  if (isHot) return '🔥'
  if (count > 0) return '●'
  return '○'
}

export default function CapabilityTile({
  slug, name, icon, description_plain,
  recent_count, is_hot, onClick,
}: CapabilityTileProps) {
  const activity = activityLabel(is_hot, recent_count)
  const actIcon = activityIcon(is_hot, recent_count)

  return (
    <button
      className={`capability-tile capability-tile--${activity.toLowerCase()}`}
      onClick={() => onClick(slug)}
      aria-label={`${name}: ${recent_count} neue Einträge, Status: ${activity}`}
      title={description_plain}
    >
      <span className="capability-tile__icon" aria-hidden="true">{icon}</span>
      <span className="capability-tile__name">{name}</span>

      <span className="capability-tile__count" aria-hidden="true">
        {recent_count > 0 ? `${recent_count} neu` : '—'}
      </span>

      {/* Activity: NOT color-only (Andrea a11y requirement) */}
      <span
        className={`capability-tile__status capability-tile__status--${activity.toLowerCase()}`}
        aria-hidden="true"
      >
        {actIcon} {activity}
      </span>

      <span className="capability-tile__desc">{description_plain}</span>
    </button>
  )
}
