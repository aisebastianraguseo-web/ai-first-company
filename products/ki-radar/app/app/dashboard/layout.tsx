'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

const navItems = [
  { href: '/dashboard', label: 'Feed', icon: '📡' },
  { href: '/dashboard/capability-map', label: 'Capability Map', icon: '🗺️' },
  { href: '/dashboard/problems', label: 'Meine Probleme', icon: '🎯' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="dashboard-layout">
      <nav className="sidebar" aria-label="Hauptnavigation">
        <div className="sidebar-brand">
          <span aria-hidden="true">📡</span>
          <span>KI-Radar</span>
        </div>

        <ul role="list" className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`nav-link ${isActive ? 'nav-link--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="sidebar-footer">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </nav>

      <div className="dashboard-content">
        {children}
      </div>
    </div>
  )
}
