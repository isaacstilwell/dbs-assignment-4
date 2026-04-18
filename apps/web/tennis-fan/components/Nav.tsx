'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'

const tabs = [
  { label: 'Scores', href: '/' },
  { label: 'Tournaments', href: '/tournaments' },
  { label: 'My Favorites', href: '/favorites' },
]

export default function Nav() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()

  return (
    <header className="bg-paper border-b-2 border-ink sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-bold text-orange tracking-tight text-lg uppercase mr-2">
          Tennis Live
        </span>

        <nav className="flex gap-0 flex-1">
          {tabs.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-1.5 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${
                  active
                    ? 'border-orange text-orange'
                    : 'border-transparent text-ink hover:text-orange'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="text-sm px-3 py-1.5 border-2 border-ink bg-orange text-paper font-bold uppercase tracking-wide shadow-[3px_3px_0_#111111] hover:shadow-[1px_1px_0_#111111] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  )
}
