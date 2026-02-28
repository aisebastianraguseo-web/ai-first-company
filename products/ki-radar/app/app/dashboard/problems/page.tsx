import { Suspense } from 'react'
import ProblemList from '../../../components/problems/ProblemList'

export default function ProblemsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Meine Problemfelder</h1>
        <p className="page-subtitle">
          Definieren Sie unternehmensspezifische Herausforderungen.
          Der KI-Radar zeigt Ihnen automatisch welche neuen Entwicklungen helfen könnten.
        </p>
      </header>

      <Suspense fallback={
        <div className="loading-state" aria-busy="true" aria-label="Problemfelder werden geladen" />
      }>
        <ProblemList />
      </Suspense>
    </div>
  )
}
