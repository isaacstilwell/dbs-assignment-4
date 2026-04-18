import { createServerClient } from '@/lib/supabase/server'
import type { Match } from '@/lib/types'
import LiveScoresFeed from '@/components/LiveScoresFeed'

export const dynamic = 'force-dynamic'

export default async function ScoresPage() {
  const supabase = createServerClient()
  const now = new Date().toISOString()
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: live }, { data: upcoming }, { data: completed }] = await Promise.all([
    supabase.from('matches').select('*').eq('status', 'in_progress'),
    supabase.from('matches').select('*').eq('status', 'scheduled')
      .gte('start_time', now).lte('start_time', in24h).order('start_time'),
    supabase.from('matches').select('*').eq('status', 'completed')
      .gte('updated_at', ago24h).order('updated_at', { ascending: false }),
  ])

  const seen = new Set<string>()
  const allMatches: Match[] = []
  for (const m of [...(live ?? []), ...(upcoming ?? []), ...(completed ?? [])]) {
    if (!seen.has(m.id)) { seen.add(m.id); allMatches.push(m as Match) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Scores</h1>
        <p className="text-ink/50 text-sm mt-1">Live and today's tennis matches</p>
      </div>
      <LiveScoresFeed initialMatches={allMatches} />
    </div>
  )
}
