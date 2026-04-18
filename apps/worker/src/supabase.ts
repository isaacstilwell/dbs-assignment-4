import { createClient } from '@supabase/supabase-js'
import type { Match, Player, Tournament } from './types.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function upsertTournaments(tournaments: Tournament[]) {
  if (tournaments.length === 0) return
  const deduped = [...new Map(tournaments.map(t => [t.id, t])).values()]
  const { error } = await supabase.from('tournaments').upsert(deduped, { onConflict: 'id' })
  if (error) console.error('[supabase] tournaments upsert error:', error.message)
  else console.log(`[supabase] upserted ${deduped.length} tournaments`)
}

export async function upsertPlayers(players: Player[]) {
  if (players.length === 0) return
  const { error } = await supabase.from('players').upsert(players, { onConflict: 'id' })
  if (error) console.error('[supabase] players upsert error:', error.message)
  else console.log(`[supabase] upserted ${players.length} players`)
}

export async function upsertMatches(matches: Match[]) {
  if (matches.length === 0) return
  const { error } = await supabase.from('matches').upsert(matches, { onConflict: 'id' })
  if (error) console.error('[supabase] matches upsert error:', error.message)
  else console.log(`[supabase] upserted ${matches.length} matches`)
}

export async function purgeOldMatches() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { error, count } = await supabase
    .from('matches')
    .delete({ count: 'exact' })
    .eq('status', 'completed')
    .lt('updated_at', cutoff)
  if (error) console.error('[supabase] purge error:', error.message)
  else if (count) console.log(`[supabase] purged ${count} old completed matches`)
}
