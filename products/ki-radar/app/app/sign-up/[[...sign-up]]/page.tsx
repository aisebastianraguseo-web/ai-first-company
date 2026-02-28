import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">KI-Radar</h1>
        <p className="auth-subtitle">Kostenlos starten — kein Kreditkarte nötig.</p>
        <SignUp />
      </div>
    </div>
  )
}
