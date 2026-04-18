import type { Match, MatchScore, MatchStatus, Player, SetScore, Tour, Tournament, TournamentStatus } from './types.js'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/tennis'

const fmt = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

async function fetchScoreboard(tour: 'atp' | 'wta', dates?: string): Promise<EspnScoreboard> {
  const url = new URL(`${ESPN_BASE}/${tour}/scoreboard`)
  if (dates) url.searchParams.set('dates', dates)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`ESPN ${tour} fetch failed: ${res.status}`)
  return res.json() as Promise<EspnScoreboard>
}


function parseTournamentStatus(event: EspnEvent): TournamentStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = event.date ? new Date(event.date) : null
  const end = event.endDate ? new Date(event.endDate) : null
  if (start && end) {
    if (today > end) return 'completed'
    if (today >= start) return 'in_progress'
    return 'upcoming'
  }
  return 'upcoming'
}

function parseMatchStatus(statusName: string, completed: boolean): MatchStatus {
  if (completed) return 'completed'
  if (statusName === 'STATUS_IN_PROGRESS') return 'in_progress'
  return 'scheduled'
}

function parseScore(competition: EspnCompetition): MatchScore | null {
  const { competitors, situation } = competition
  if (!competitors?.length) return null

  const sets: SetScore[] = []
  const maxSets = Math.max(
    competitors[0]?.linescores?.length ?? 0,
    competitors[1]?.linescores?.length ?? 0
  )

  for (let i = 0; i < maxSets; i++) {
    sets.push({
      p1: Number(competitors[0]?.linescores?.[i]?.value ?? 0),
      p2: Number(competitors[1]?.linescores?.[i]?.value ?? 0),
    })
  }

  const isLive = competition.status?.type?.name === 'STATUS_IN_PROGRESS'
  if (!isLive && sets.length === 0) return null

  const current = isLive
    ? {
        p1: String(competitors[0]?.score ?? '0'),
        p2: String(competitors[1]?.score ?? '0'),
        serving: (
          situation?.lastPlay?.athletesInvolved?.[0]?.id === competitors[0]?.athlete?.id ? 1 : 2
        ) as 1 | 2,
      }
    : undefined

  return { sets, ...(current ? { current } : {}) }
}

// ESPN tennis: events = tournaments, groupings[].competitions = matches
function normalizeEspnData(
  data: EspnScoreboard,
  tour: Tour
): { tournaments: Tournament[]; players: Player[]; matches: Match[] } {
  const tournaments: Map<string, Tournament> = new Map()
  const players: Map<string, Player> = new Map()
  const matches: Match[] = []
  const now = new Date().toISOString()

  for (const event of data.events ?? []) {
    const tournament: Tournament = {
      id: event.id,
      name: event.name,
      location: event.venue?.fullName ?? event.venue?.address?.city ?? null,
      surface: event.venue?.surface ?? null,
      category: null,
      tour,
      start_date: event.date?.split('T')[0] ?? null,
      end_date: event.endDate?.split('T')[0] ?? null,
      status: parseTournamentStatus(event),
      logo_url: null,
      updated_at: now,
    }
    tournaments.set(event.id, tournament)

    for (const groupingEntry of event.groupings ?? []) {
      const round = groupingEntry.grouping?.displayName ?? null

      for (const competition of groupingEntry.competitions ?? []) {
        const [comp1, comp2] = competition.competitors ?? []
        if (!comp1 || !comp2) continue

        const name1 = comp1.athlete?.displayName ?? comp1.athlete?.shortName ?? ''
        const name2 = comp2.athlete?.displayName ?? comp2.athlete?.shortName ?? ''
        const invalid = (n: string) => !n || n === 'TBD' || n === 'Unknown'
        if (invalid(name1) || invalid(name2)) continue

        const p1Id = comp1.athlete?.id ?? comp1.id
        const p2Id = comp2.athlete?.id ?? comp2.id
        const p1: Player = {
          id: p1Id,
          name: comp1.athlete?.displayName ?? comp1.athlete?.shortName ?? 'Unknown',
          short_name: comp1.athlete?.shortName ?? null,
          nationality: comp1.athlete?.flag?.alt ?? null,
          ranking: comp1.curatedRank?.current ?? null,
          avatar_url: comp1.athlete?.headshot?.href ?? `https://a.espncdn.com/i/headshots/tennis/players/full/${p1Id}.png`,
          tour,
          updated_at: now,
        }
        const p2: Player = {
          id: p2Id,
          name: comp2.athlete?.displayName ?? comp2.athlete?.shortName ?? 'Unknown',
          short_name: comp2.athlete?.shortName ?? null,
          nationality: comp2.athlete?.flag?.alt ?? null,
          ranking: comp2.curatedRank?.current ?? null,
          avatar_url: comp2.athlete?.headshot?.href ?? `https://a.espncdn.com/i/headshots/tennis/players/full/${p2Id}.png`,
          tour,
          updated_at: now,
        }
        players.set(p1.id, p1)
        players.set(p2.id, p2)

        const statusName = competition.status?.type?.name ?? ''
        const completed = competition.status?.type?.completed ?? false
        const winner = competition.competitors?.find(c => c.winner)

        matches.push({
          id: competition.id,
          tournament_id: event.id,
          tournament_name: event.name,
          round,
          player1_id: p1.id,
          player1_name: p1.name,
          player2_id: p2.id,
          player2_name: p2.name,
          status: parseMatchStatus(statusName, completed),
          score: parseScore(competition),
          winner_id: winner?.athlete?.id ?? null,
          start_time: competition.date ?? null,
          tour,
          updated_at: now,
        })
      }
    }
  }

  console.log(`[espn] ${tour} normalized: ${tournaments.size} tournaments, ${players.size} players, ${matches.length} matches`)
  return {
    tournaments: Array.from(tournaments.values()),
    players: Array.from(players.values()),
    matches,
  }
}

export async function fetchLiveScores(tour: Tour): Promise<ReturnType<typeof normalizeEspnData>> {
  const leagueParam = tour === 'ATP' ? 'atp' : 'wta'
  const data = await fetchScoreboard(leagueParam)
  return normalizeEspnData(data, tour)
}

export async function fetchScheduledMatches(tour: Tour): Promise<ReturnType<typeof normalizeEspnData>> {
  const leagueParam = tour === 'ATP' ? 'atp' : 'wta'
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const data = await fetchScoreboard(leagueParam, `${fmt(today)}-${fmt(tomorrow)}`)
  return normalizeEspnData(data, tour)
}

export async function fetchUpcomingTournaments(tour: Tour): Promise<Tournament[]> {
  const leagueParam = tour === 'ATP' ? 'atp' : 'wta'
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 30)
  const data = await fetchScoreboard(leagueParam, `${fmt(today)}-${fmt(end)}`)
  const { tournaments } = normalizeEspnData(data, tour)
  return tournaments
}


// ESPN response types
interface EspnScoreboard {
  events?: EspnEvent[]
  leagues?: EspnLeague[]
}

interface EspnLeague {
  id: string
  name: string
  abbreviation?: string
  logos?: { href: string }[]
  calendar?: unknown[]
}


interface EspnEvent {
  id: string
  uid: string
  name: string
  shortName?: string
  date?: string
  endDate?: string
  major?: boolean
  groupings?: EspnGroupingEntry[]
  status?: { type?: { name: string; completed: boolean } }
  venue?: { fullName?: string; surface?: string; address?: { city?: string } }
}

interface EspnGroupingEntry {
  grouping?: { id: string; slug: string; displayName: string }
  competitions?: EspnCompetition[]
}

interface EspnCompetition {
  id: string
  date?: string
  status?: { type?: { name: string; completed: boolean } }
  situation?: { lastPlay?: { athletesInvolved?: { id: string }[] } }
  competitors?: EspnCompetitor[]
}

interface EspnCompetitor {
  id: string
  score?: string
  winner?: boolean
  linescores?: { value: string }[]
  curatedRank?: { current: number }
  athlete?: {
    id: string
    displayName?: string
    shortName?: string
    headshot?: { href: string }
    flag?: { alt: string }
  }
}
