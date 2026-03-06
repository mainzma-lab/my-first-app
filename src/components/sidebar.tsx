'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/context/user-context'
import { logout } from '@/app/(app)/actions'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/kunden', label: 'Kunden' },
  { href: '/buchungen', label: 'Buchungen' },
  { href: '/belegungsplan', label: 'Belegungsplan' },
]

const ADMIN_NAV_ITEMS = [
  { href: '/reporting', label: 'Reporting' },
  { href: '/einstellungen/benutzer', label: 'Benutzerverwaltung' },
  { href: '/einstellungen/preise', label: 'Preise' },
  { href: '/einstellungen/crm', label: 'CRM Einstellungen' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const user = useUser()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col h-full shrink-0">
      <div className="px-5 py-4 border-b border-gray-700">
        <h1 className="font-semibold text-base leading-tight">Hundepension Schmidt</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}

        {user.role === 'admin' && (
          <div className="pt-5">
            <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Verwaltung
            </p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <div className="px-3 mb-3">
          <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {user.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  )
}
