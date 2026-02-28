import { Suspense } from 'react'
import CapabilityMap from '../../../components/capability/CapabilityMap'

export default function CapabilityMapPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Capability Map</h1>
        <p className="page-subtitle">
          Übersicht aller KI-Fähigkeitsbereiche und ihre aktuellen Entwicklungen
        </p>
      </header>

      <Suspense fallback={
        <div className="loading-state" aria-busy="true" aria-label="Capability Map wird geladen">
          <div className="capability-grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-tile" />
            ))}
          </div>
        </div>
      }>
        <CapabilityMap />
      </Suspense>
    </div>
  )
}
