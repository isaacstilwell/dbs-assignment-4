import 'dotenv/config'
import express from 'express'
import cron from 'node-cron'
import { fetchLiveScores, fetchScheduledMatches, fetchUpcomingTournaments } from './espn.js'
import { purgeOldMatches, upsertMatches, upsertPlayers, upsertTournaments } from './supabase.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Poll ESPN for in-progress matches only — runs every 5 seconds
async function syncLiveMatches() {
  try {
    const [atp, wta] = await Promise.all([fetchLiveScores('ATP'), fetchLiveScores('WTA')])

    const liveMatches = [...atp.matches, ...wta.matches].filter(m => m.status === 'in_progress')
    if (liveMatches.length === 0) return

    const playerMap = new Map([
      ...atp.players.map(p => [p.id, p] as const),
      ...wta.players.map(p => [p.id, p] as const),
    ])
    const livePlayers = liveMatches.flatMap(m =>
      [m.player1_id, m.player2_id].filter(Boolean).map(id => playerMap.get(id!)).filter(Boolean)
    ) as typeof atp.players

    await upsertPlayers(livePlayers)
    await upsertMatches(liveMatches)
    console.log(`[live] updated ${liveMatches.length} in-progress matches`)
  } catch (err) {
    console.error('[live] sync error:', err)
  }
}

// Poll scheduled + completed matches for today/next 24h — runs every 2 minutes
async function syncScheduled() {
  console.log('[scheduled] syncing...')
  try {
    const [atpLive, wtaLive, atpSched, wtaSched] = await Promise.all([
      fetchLiveScores('ATP'),
      fetchLiveScores('WTA'),
      fetchScheduledMatches('ATP'),
      fetchScheduledMatches('WTA'),
    ])

    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const tournamentMap = new Map([
      ...[...atpSched.tournaments, ...wtaSched.tournaments].map(t => [t.id, t] as const),
      ...[...atpLive.tournaments, ...wtaLive.tournaments].map(t => [t.id, t] as const),
    ])
    const playerMap = new Map([
      ...[...atpSched.players, ...wtaSched.players].map(p => [p.id, p] as const),
      ...[...atpLive.players, ...wtaLive.players].map(p => [p.id, p] as const),
    ])
    const matchMap = new Map([
      ...[...atpSched.matches, ...wtaSched.matches].map(m => [m.id, m] as const),
      ...[...atpLive.matches, ...wtaLive.matches].map(m => [m.id, m] as const),
    ])

    const relevantMatches = [...matchMap.values()].filter(m => {
      if (m.status === 'in_progress') return true
      if (!m.start_time) return false
      const t = new Date(m.start_time)
      if (m.status === 'completed') return t >= yesterday
      const today = todayStart()
      return t >= today && t <= in24h
    })

    await upsertTournaments([...tournamentMap.values()])
    await upsertPlayers([...playerMap.values()])
    await upsertMatches(relevantMatches)
    console.log(`[scheduled] wrote ${relevantMatches.length} matches`)
  } catch (err) {
    console.error('[scheduled] sync error:', err)
  }
}

async function syncUpcomingTournaments() {
  try {
    const [atp, wta] = await Promise.all([
      fetchUpcomingTournaments('ATP'),
      fetchUpcomingTournaments('WTA'),
    ])
    await upsertTournaments([...atp, ...wta])
    console.log('[tournaments] synced upcoming')
  } catch (err) {
    console.error('[tournaments] sync error:', err)
  }
}

// Every 5 seconds — live scores only
cron.schedule('*/5 * * * * *', syncLiveMatches)

// Every 2 minutes — scheduled + completed + tournaments
cron.schedule('*/2 * * * *', syncScheduled)

// Every 10 minutes — upcoming tournament calendar
cron.schedule('*/10 * * * *', syncUpcomingTournaments)

// Every hour — purge old completed matches
cron.schedule('0 * * * *', purgeOldMatches)

app.listen(PORT, () => {
  console.log(`[worker] listening on port ${PORT}`)
  syncScheduled()
  syncUpcomingTournaments()
})
