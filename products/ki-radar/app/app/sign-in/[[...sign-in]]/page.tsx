import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">KI-Radar</h1>
        <p className="auth-subtitle">KI-Entwicklungen. Gefiltert. Relevant.</p>
        <SignIn />
      </div>
    </div>
  )
}
