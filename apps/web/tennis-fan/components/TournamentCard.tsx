import type { Tournament } from '@/lib/types'

interface Props {
  tournament: Tournament
}

const SURFACE_STYLES: Record<string, { bg: string; text: string }> = {
  clay:   { bg: 'bg-orange text-paper',   text: '' },
  hard:   { bg: 'bg-mblue text-paper',    text: '' },
  grass:  { bg: 'bg-teal text-paper',     text: '' },
  carpet: { bg: 'bg-mpink text-paper',    text: '' },
}

function surfaceStyle(surface: string | null) {
  const key = surface?.toLowerCase() ?? ''
  return SURFACE_STYLES[key]?.bg ?? 'bg-ink text-paper'
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return 'TBD'
  const s = new Date(start)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (!end) return s.toLocaleDateString(undefined, opts)
  const e = new Date(end)
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.getDate()}`
  }
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`
}

export default function TournamentCard({ tournament }: Props) {
  const surfaceBg = surfaceStyle(tournament.surface)
  const isLive = tournament.status === 'in_progress'

  return (
    <div className="bg-paper border-2 border-ink shadow-[4px_4px_0_#111111] hover:shadow-[2px_2px_0_#111111] hover:translate-x-0.5 hover:translate-y-0.5 transition-all p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isLive && (
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-paper bg-orange px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-paper animate-pulse" />
                Live
              </span>
            )}
            <span className="text-xs px-1.5 py-0.5 border border-ink font-bold uppercase tracking-wide text-ink">
              {tournament.tour}
            </span>
            {tournament.surface && (
              <span className={`text-xs px-1.5 py-0.5 font-bold uppercase tracking-wide ${surfaceBg}`}>
                {tournament.surface}
              </span>
            )}
          </div>

          <h3 className="font-bold text-ink truncate">{tournament.name}</h3>

          {tournament.location && (
            <p className="text-sm text-ink/60 mt-0.5 truncate">{tournament.location}</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-ink">{formatDateRange(tournament.start_date, tournament.end_date)}</p>
          {tournament.category && (
            <p className="text-xs text-ink/50 mt-0.5 uppercase tracking-wide">{tournament.category}</p>
          )}
        </div>
      </div>
    </div>
  )
}
