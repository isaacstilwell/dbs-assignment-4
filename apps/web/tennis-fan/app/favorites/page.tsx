'use client'

import { useUser, SignInButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import type { Match, UserFavorite } from '@/lib/types'
import LiveScoresFeed from '@/components/LiveScoresFeed'

export default function FavoritesPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [favorites, setFavorites] = useState<UserFavorite[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { setLoading(false); return }

    async function load() {
      const [favs, matches] = await Promise.all([
        fetch('/api/favorites').then(r => r.json()),
        fetch('/api/matches').then(r => r.json()),
      ])
      setFavorites(favs as UserFavorite[])
      setMatches(matches as Match[])
      setLoading(false)
    }

    load()
  }, [isLoaded, isSignedIn])

  if (!isLoaded || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="text-ink/40 text-sm font-bold uppercase tracking-wide animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
        <div className="text-5xl">★</div>
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">My Favorites</h1>
        <p className="text-ink/60 max-w-sm">
          Sign in to follow your favorite players and see their matches here.
        </p>
        <SignInButton mode="modal">
          <button className="mt-2 px-5 py-2.5 border-2 border-ink bg-orange text-paper font-bold uppercase tracking-wide shadow-[4px_4px_0_#111111] hover:shadow-[2px_2px_0_#111111] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            Sign in to continue
          </button>
        </SignInButton>
      </div>
    )
  }

  const favoritePlayerIds = favorites.map(f => f.player_id)

  if (favorites.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">My Favorites</h1>
          <p className="text-ink/50 text-sm mt-1">Players you're following</p>
        </div>
        <div className="text-center py-16 border-2 border-dashed border-ink/20">
          <div className="text-4xl mb-3 text-mustard">★</div>
          <p className="text-lg font-bold text-ink/40 uppercase tracking-wide">No favorites yet</p>
          <p className="text-sm mt-1 text-ink/30">Click the star next to any player's name on the Scores page to follow them.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">My Favorites</h1>
        <p className="text-ink/50 text-sm mt-1">
          Following {favorites.length} player{favorites.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {favorites.map(f => (
          <span key={f.player_id} className="text-sm px-3 py-1 border-2 border-ink bg-paper font-bold text-ink flex items-center gap-1 shadow-[2px_2px_0_#111111]">
            <span className="text-mustard">★</span>
            {f.player_name}
          </span>
        ))}
      </div>

      <LiveScoresFeed
        initialMatches={matches}
        filterPlayerIds={favoritePlayerIds}
      />
    </div>
  )
}
