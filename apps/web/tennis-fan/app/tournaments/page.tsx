import { createServerClient } from '@/lib/supabase/server'
import type { Tournament } from '@/lib/types'
import TournamentCard from '@/components/TournamentCard'

export const dynamic = 'force-dynamic'

export default async function TournamentsPage() {
  const supabase = createServerClient()

  const today = new Date()
  const in30 = new Date(today)
  in30.setDate(in30.getDate() + 30)

  const [{ data: live }, { data: upcoming }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('*')
      .eq('status', 'in_progress')
      .order('start_date'),
    supabase
      .from('tournaments')
      .select('*')
      .eq('status', 'upcoming')
      .gte('start_date', today.toISOString().split('T')[0])
      .lte('start_date', in30.toISOString().split('T')[0])
      .order('start_date'),
  ])

  const liveTournaments = (live ?? []) as Tournament[]
  const upcomingTournaments = (upcoming ?? []) as Tournament[]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink uppercase tracking-wide">Tournaments</h1>
        <p className="text-ink/50 text-sm mt-1">Current and upcoming events</p>
      </div>

      {liveTournaments.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold text-ink/50 uppercase tracking-widest mb-3">
            In Progress
          </h2>
          <div className="flex flex-col gap-3">
            {liveTournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-bold text-ink/50 uppercase tracking-widest mb-3">
          Upcoming — Next 30 Days
        </h2>
        {upcomingTournaments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-ink/20">
            <p className="font-bold text-ink/40 uppercase tracking-wide">No upcoming tournaments found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingTournaments.map(t => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
