export type Tour = 'ATP' | 'WTA'

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed'

export type TournamentStatus = 'upcoming' | 'in_progress' | 'completed'

export interface SetScore {
  p1: number
  p2: number
}

export interface CurrentGame {
  p1: string
  p2: string
  serving: 1 | 2
}

export interface MatchScore {
  sets: SetScore[]
  current?: CurrentGame
}

export interface Tournament {
  id: string
  name: string
  location: string | null
  surface: string | null
  category: string | null
  tour: Tour
  start_date: string | null
  end_date: string | null
  status: TournamentStatus
  logo_url: string | null
  updated_at: string
}

export interface Player {
  id: string
  name: string
  short_name: string | null
  nationality: string | null
  ranking: number | null
  avatar_url: string | null
  tour: Tour
  updated_at: string
}

export interface Match {
  id: string
  tournament_id: string | null
  tournament_name: string | null
  round: string | null
  player1_id: string | null
  player1_name: string
  player2_id: string | null
  player2_name: string
  status: MatchStatus
  score: MatchScore | null
  winner_id: string | null
  start_time: string | null
  tour: Tour
  updated_at: string
}
