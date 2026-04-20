'use client'

import { useState } from 'react'
import type { Match } from '@/lib/types'
import FavoriteButton from './FavoriteButton'

interface Props {
  match: Match
  favoritedPlayerIds?: Set<string>
  onFavoriteToggle?: (playerId: string, nowFavorited: boolean, playerName?: string) => void
}

const NATIONALITY_TO_ALPHA2: Record<string, string> = {
  'Andorra': 'AD', 'Argentina': 'AR', 'Australia': 'AU', 'Austria': 'AT',
  'Belarus': 'BY', 'Belgium': 'BE', 'Bosnia and Herzegovina': 'BA', 'Brazil': 'BR',
  'Bulgaria': 'BG', 'Canada': 'CA', 'Chile': 'CL', 'China': 'CN', 'Croatia': 'HR',
  'Czechia': 'CZ', 'Egypt': 'EG', 'Finland': 'FI', 'France': 'FR', 'Georgia': 'GE',
  'Germany': 'DE', 'Great Britain': 'GB', 'Greece': 'GR', 'Hungary': 'HU',
  'India': 'IN', 'Italy': 'IT', 'Japan': 'JP', 'Kazakhstan': 'KZ', 'Latvia': 'LV',
  'Liechtenstein': 'LI', 'Lithuania': 'LT', 'Malta': 'MT', 'Netherlands': 'NL',
  'Norway': 'NO', 'Peru': 'PE', 'Philippines': 'PH', 'Poland': 'PL', 'Portugal': 'PT',
  'Romania': 'RO', 'Russia': 'RU', 'Serbia': 'RS', 'Slovakia': 'SK', 'Slovenia': 'SI',
  'Spain': 'ES', 'Switzerland': 'CH', 'Türkiye': 'TR', 'Ukraine': 'UA',
  'USA': 'US', 'Uzbekistan': 'UZ',
}

function flagEmoji(nationality: string | null): string {
  if (!nationality) return ''
  const code = NATIONALITY_TO_ALPHA2[nationality]
  if (!code) return ''
  return [...code].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function PlayerAvatar({ id, name }: { id: string | null; name: string }) {
  const [errored, setErrored] = useState(false)
  const src = id ? `https://a.espncdn.com/i/headshots/tennis/players/full/${id}.png` : null

  if (!src || errored) {
    return (
      <div className="w-8 h-8 rounded-full border-2 border-ink bg-mustard flex items-center justify-center shrink-0 text-xs font-bold text-ink">
        {name.charAt(0)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setErrored(true)}
      className="w-8 h-8 rounded-full object-cover object-top border-2 border-ink shrink-0"
    />
  )
}

function StatusBadge({ status, isWalkover }: { status: Match['status']; isWalkover: boolean }) {
  if (status === 'in_progress') {
    return (
      <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-paper bg-orange px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-paper animate-pulse" />
        Live
      </span>
    )
  }
  if (status === 'completed') {
    return <span className="text-xs font-bold uppercase tracking-wide text-ink border border-ink px-2 py-0.5">{isWalkover ? 'W/O' : 'Final'}</span>
  }
  return <span className="text-xs font-bold uppercase tracking-wide text-ink/50 border border-ink/30 px-2 py-0.5">Scheduled</span>
}

interface PlayerRowProps {
  id: string | null
  name: string
  nationality: string | null
  playerId: string
  isWinner: boolean
  isServing: boolean
  isFavorited: boolean
  onFavoriteToggle?: (playerId: string, nowFavorited: boolean, playerName?: string) => void
  sets: number[]
  isCurrentSet: boolean[]
  isLive: boolean
  isWalkover: boolean
  noScore: boolean
  startTime: string | null
}

function PlayerRow({ id, name, nationality, playerId, isWinner, isServing, isFavorited, onFavoriteToggle, sets, isCurrentSet, isLive, isWalkover, noScore, startTime }: PlayerRowProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      <PlayerAvatar id={id} name={name} />
      <FavoriteButton
        playerId={playerId}
        playerName={name}
        initialFavorited={isFavorited}
        onToggle={onFavoriteToggle}
      />
      <span className={`text-sm font-bold flex-1 min-w-0 truncate ${isWinner ? 'text-orange' : 'text-ink'}`}>
        {name}
        {flagEmoji(nationality) && <span className="ml-1.5 text-base">{flagEmoji(nationality)}</span>}
        {isServing && isLive && <span className="ml-1 text-orange text-xs">●</span>}
      </span>
      {noScore ? (
        isWalkover ? null : startTime ? (
          <span className="text-sm font-bold text-ink/50 shrink-0">
            {new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-sm font-bold text-ink/30 shrink-0">TBD</span>
        )
      ) : (
        <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-sm">
          {sets.map((s, i) => (
            <span
              key={i}
              className={`w-5 text-center ${(isCurrentSet[i] && isLive) || isWinner ? 'text-orange' : 'text-ink'}`}
            >{s}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function deriveWinnerId(match: Match): string | null {
  if (match.winner_id) return match.winner_id
  if (match.status !== 'completed' || !match.score?.sets.length) return null
  const p1Sets = match.score.sets.filter(s => s.p1 > s.p2).length
  const p2Sets = match.score.sets.filter(s => s.p2 > s.p1).length
  if (p1Sets > p2Sets) return match.player1_id
  if (p2Sets > p1Sets) return match.player2_id
  return null
}

export default function MatchCard({ match, favoritedPlayerIds, onFavoriteToggle }: Props) {
  const { score, status, player1_id, player2_id } = match
  const isLive = status === 'in_progress'
  const isCompleted = status === 'completed'
  const noScore = !score || (score.sets.length === 0 && !score.current)
  const isWalkover = match.walkover ?? (isCompleted && noScore)
  const effectiveWinnerId = isCompleted ? deriveWinnerId(match) : null
  const p1Winner = isCompleted && effectiveWinnerId === player1_id
  const p2Winner = isCompleted && effectiveWinnerId === player2_id
  const p1Fav = favoritedPlayerIds?.has(match.player1_id ?? '') ?? false
  const p2Fav = favoritedPlayerIds?.has(match.player2_id ?? '') ?? false
  const sets = score?.sets ?? []
  const currentSetIdx = isLive && sets.length > 0 ? sets.length - 1 : -1
  const isCurrentSet = sets.map((_, i) => i === currentSetIdx)

  return (
    <div className="bg-paper border-2 border-ink shadow-[4px_4px_0_#111111] hover:shadow-[2px_2px_0_#111111] hover:translate-x-0.5 hover:translate-y-0.5 transition-all p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wide text-ink/50 truncate">{match.tournament_name}</span>
          {match.round && (
            <>
              <span className="text-ink/30">·</span>
              <span className="text-xs text-ink/50 truncate">{match.round}</span>
            </>
          )}
          <span className="text-xs px-1.5 py-0.5 border border-ink font-bold uppercase tracking-wide text-ink shrink-0">
            {match.tour}
          </span>
        </div>
        <StatusBadge status={status} isWalkover={isWalkover} />
      </div>

      {/* Players */}
      <div className="flex flex-col gap-2">
        <PlayerRow
          id={player1_id}
          name={match.player1_name}
          nationality={match.player1_nationality ?? null}
          playerId={player1_id ?? ''}
          isWinner={p1Winner}
          isServing={score?.current?.serving === 1}
          isFavorited={p1Fav}
          onFavoriteToggle={onFavoriteToggle}
          sets={sets.map(s => s.p1)}
          isCurrentSet={isCurrentSet}
          isLive={isLive}
          isWalkover={isWalkover}
          noScore={noScore}
          startTime={match.start_time}
        />
        <PlayerRow
          id={player2_id}
          name={match.player2_name}
          nationality={match.player2_nationality ?? null}
          playerId={player2_id ?? ''}
          isWinner={p2Winner}
          isServing={score?.current?.serving === 2}
          isFavorited={p2Fav}
          onFavoriteToggle={onFavoriteToggle}
          sets={sets.map(s => s.p2)}
          isCurrentSet={isCurrentSet}
          isLive={isLive}
          isWalkover={isWalkover}
          noScore={noScore}
          startTime={match.start_time}
        />
      </div>
    </div>
  )
}
