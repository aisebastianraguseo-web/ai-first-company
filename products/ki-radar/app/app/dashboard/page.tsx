import { Suspense } from 'react'
import FeedList from '../../components/feed/FeedList'

export default function FeedPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>KI-Feed</h1>
        <p className="page-subtitle">
          Neueste KI-Entwicklungen — gefiltert nach Relevanz
        </p>
      </header>

      <Suspense fallback={
        <div className="loading-state" aria-busy="true" aria-label="Feed wird geladen">
          <div className="skeleton-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-card" aria-hidden="true" />
            ))}
          </div>
        </div>
      }>
        <FeedList />
      </Suspense>
    </div>
  )
}
