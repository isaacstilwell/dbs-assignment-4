'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import type { Match, UserFavorite } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import MatchCard from './MatchCard'

interface Props {
  initialMatches: Match[]
  filterPlayerIds?: string[]
  onFavoriteToggle?: (playerId: string, nowFavorited: boolean) => void
}

type Tab = 'live' | 'upcoming' | 'completed'

function upsertMatch(prev: Match[], updated: Match): Match[] {
  const idx = prev.findIndex(m => m.id === updated.id)
  if (idx === -1) return [updated, ...prev]
  const next = [...prev]
  next[idx] = updated
  return next
}

function filterByTab(matches: Match[], tab: Tab): Match[] {
  switch (tab) {
    case 'live':
      return matches.filter(m => m.status === 'in_progress')
    case 'upcoming':
      return matches.filter(m => m.status === 'scheduled')
    case 'completed':
      return matches.filter(m => m.status === 'completed')
  }
}

export default function LiveScoresFeed({ initialMatches, filterPlayerIds, onFavoriteToggle: onFavoriteToggleProp }: Props) {
  const { isSignedIn } = useUser()
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>('live')

  useEffect(() => {
    if (!isSignedIn) { setFavoritedIds(new Set()); return }
    fetch('/api/favorites')
      .then(r => r.json())
      .then((data: UserFavorite[]) => setFavoritedIds(new Set(data.map(f => f.player_id))))
      .catch(() => {})
  }, [isSignedIn])

  useEffect(() => {
    setMatches(initialMatches)
  }, [initialMatches])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          setMatches(prev => upsertMatch(prev, payload.new as Match))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function onFavoriteToggle(playerId: string, nowFavorited: boolean) {
    setFavoritedIds(prev => {
      const next = new Set(prev)
      if (nowFavorited) next.add(playerId)
      else next.delete(playerId)
      return next
    })
    onFavoriteToggleProp?.(playerId, nowFavorited)
  }

  let displayed = filterByTab(matches, tab)
  if (filterPlayerIds && filterPlayerIds.length > 0) {
    const ids = new Set(filterPlayerIds)
    displayed = displayed.filter(m =>
      ids.has(m.player1_id ?? '') || ids.has(m.player2_id ?? '')
    )
  }

  const visibleMatches = filterPlayerIds?.length
    ? matches.filter(m => {
        const ids = new Set(filterPlayerIds)
        return ids.has(m.player1_id ?? '') || ids.has(m.player2_id ?? '')
      })
    : matches

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'live',      label: 'Live',      count: visibleMatches.filter(m => m.status === 'in_progress').length },
    { key: 'upcoming',  label: 'Upcoming',  count: visibleMatches.filter(m => m.status === 'scheduled').length },
    { key: 'completed', label: 'Completed', count: visibleMatches.filter(m => m.status === 'completed').length },
  ]

  return (
    <div>
      <div className="flex gap-0 mb-6 border-b-2 border-ink">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === t.key
                ? 'border-orange text-orange'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 font-bold ${
                tab === t.key ? 'bg-orange text-paper' : 'bg-ink/10 text-ink'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-ink/20">
          <p className="text-lg font-bold text-ink/40 uppercase tracking-wide">No matches</p>
          <p className="text-sm mt-1 text-ink/30">
            {tab === 'live' ? 'No matches in progress right now.' : 'Check back later.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              favoritedPlayerIds={favoritedIds}
              onFavoriteToggle={onFavoriteToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
