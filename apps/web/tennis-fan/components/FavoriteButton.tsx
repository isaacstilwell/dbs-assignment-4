'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { useState, useTransition } from 'react'

interface Props {
  playerId: string
  playerName: string
  initialFavorited?: boolean
  onToggle?: (playerId: string, nowFavorited: boolean) => void
}

export default function FavoriteButton({ playerId, playerName, initialFavorited = false, onToggle }: Props) {
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  // Sync if parent updates initialFavorited (e.g. after favorites load from API)
  if (initialFavorited !== favorited && !isPending) {
    setFavorited(initialFavorited)
  }

  function handleClick() {
    if (!isSignedIn) {
      openSignIn()
      return
    }

    startTransition(async () => {
      const next = !favorited
      if (favorited) {
        const res = await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId }),
        })
        if (!res.ok) { console.error('[favorites] DELETE failed:', await res.json()); return }
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId, player_name: playerName }),
        })
        if (!res.ok) { console.error('[favorites] POST failed:', await res.json()); return }
      }
      setFavorited(next)
      onToggle?.(playerId, next)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className="p-1 transition-colors hover:bg-ink/5 disabled:opacity-50 cursor-pointer"
      aria-label={favorited ? `Unfollow ${playerName}` : `Follow ${playerName}`}
    >
      {favorited ? (
        <svg className="w-4 h-4 text-mustard fill-mustard" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-ink/30 hover:text-mustard" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
    </button>
  )
}
