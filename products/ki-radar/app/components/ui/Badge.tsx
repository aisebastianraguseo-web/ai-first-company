interface BadgeProps {
  slug: string
  label: string
  uncertain?: boolean
  title?: string
}

export default function Badge({ slug, label, uncertain = false, title }: BadgeProps) {
  return (
    <span
      className={`badge badge--capability ${uncertain ? 'badge--uncertain' : ''}`}
      data-slug={slug}
      title={title}
      aria-label={uncertain ? `${label} (Unsichere Kategorisierung)` : label}
    >
      {label}
      {uncertain && <span aria-hidden="true"> ⚬</span>}
    </span>
  )
}
