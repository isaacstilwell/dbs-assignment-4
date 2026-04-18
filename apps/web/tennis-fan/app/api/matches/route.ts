import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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
  const allMatches = []
  for (const m of [...(live ?? []), ...(upcoming ?? []), ...(completed ?? [])]) {
    if (!seen.has(m.id)) { seen.add(m.id); allMatches.push(m) }
  }

  return NextResponse.json(allMatches)
}
