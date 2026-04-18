# Tennis Live — Project Overview

Live tennis scores dashboard. Monorepo with two apps:
- `apps/web/tennis-fan` — Next.js 16 frontend, hosted on Vercel
- `apps/worker` — Node.js polling worker, hosted on Railway

## Architecture

```
ESPN unofficial API
  └─ poll every 5s (live) / 2min (scheduled) ──► Worker (Railway)
                                                      └─ upsert ──► Supabase
                                                                       ├─ Realtime ──► Web (Vercel)
                                                                       └─ user_favorites (Clerk user_id)
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16.2.4, Tailwind v4, TypeScript |
| Auth | Clerk v7 |
| Database | Supabase (Postgres + Realtime) |
| Worker | Node.js, tsx, node-cron, Express |
| Data source | ESPN unofficial tennis API (no key required) |

## Next.js 16 Breaking Changes

This project uses Next.js 16 which has breaking changes from v14/v15:
- Middleware file is `proxy.ts` (not `middleware.ts`), exports `proxy` (not `middleware`)
- `params` and `searchParams` in page/layout components are Promises — must `await` them
- `cookies()` and `headers()` are async only
- Turbopack is default for `next dev` and `next build`

## Clerk v7

- No `SignedIn`/`SignedOut` components — use `useUser()` with conditional rendering
- `UserButton` has no `afterSignOutUrl` prop
- Server-side auth: `import { auth } from '@clerk/nextjs/server'`, then `const { userId } = await auth()`

## Auth Pattern

Client components never write directly to Supabase for auth-gated data. Instead:
- Favorites reads/writes go through `/api/favorites` (uses Clerk `auth()` + service role key)
- Match reads go through `/api/matches` for the favorites page
- Public data (scores, tournaments) uses the Supabase anon key directly in server components

## Database Schema

```sql
tournaments  (id, name, location, surface, category, tour, start_date, end_date, status, logo_url, updated_at)
players      (id, name, short_name, nationality, ranking, avatar_url, tour, updated_at)
matches      (id, tournament_id, tournament_name, round, player1_id, player1_name, player1_nationality,
              player2_id, player2_name, player2_nationality, status, score JSONB, winner_id,
              walkover BOOLEAN, start_time, tour, updated_at)
user_favorites (id UUID, user_id TEXT, player_id TEXT, player_name TEXT, created_at)
```

- `matches.score` shape: `{ sets: [{p1, p2}], current?: {p1, p2, serving: 1|2} }`
- `matches.status`: `'scheduled' | 'in_progress' | 'completed'`
- `matches.walkover`: true when ESPN marks match completed with no score (opponent withdrew)
- RLS enabled on all tables; service role key used in worker and API routes to bypass RLS
- `supabase_realtime` publication includes `matches` and `tournaments`

## ESPN API

- ATP: `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard`
- WTA: `https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard`
- Date range: append `?dates=YYYYMMDD-YYYYMMDD`
- No auth required
- Response structure: `events[]` = tournaments, `event.groupings[].competitions[]` = matches
- Competitor IDs: singles uses `competitor.athlete.id` with fallback to `competitor.id`
- Tournament status from ESPN is unreliable — derived from `event.date`/`event.endDate` instead
- Player headshots: `https://a.espncdn.com/i/headshots/tennis/players/full/{espn_id}.png` (partial coverage)
- Player nationality comes from `competitor.athlete.flag.alt` (country name string)

## Worker Cron Schedule

| Interval | Job |
|---|---|
| Every 5s | `syncLiveMatches` — in_progress matches only |
| Every 2min | `syncScheduled` — scheduled + completed + tournaments |
| Every 10min | `syncUpcomingTournaments` — next 30 days |
| Every 1hr | `purgeOldMatches` — delete completed matches older than 24h |

Scheduled sync includes completed matches from last 48h (to catch matches that finish overnight).

## Worker Env

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=3001
```

## Web Env

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Frontend Structure

```
app/
  page.tsx                  # Scores page (server component, SSR initial data)
  tournaments/page.tsx      # Tournaments page (server component)
  favorites/page.tsx        # My Favorites (client component, Clerk auth-gated)
  api/favorites/route.ts    # GET/POST/DELETE favorites (Clerk auth)
  api/matches/route.ts      # GET matches for favorites page

components/
  Nav.tsx                   # Sticky nav, tab links, Clerk UserButton
  LiveScoresFeed.tsx        # Client component; Supabase Realtime subscription; Live/Upcoming/Completed tabs
  MatchCard.tsx             # Single match card; per-player inline scores; flag emoji; walkover detection
  TournamentCard.tsx        # Tournament card with surface badge
  FavoriteButton.tsx        # Star toggle; opens Clerk sign-in modal if logged out

lib/
  supabase/client.ts        # Browser Supabase client (singleton)
  supabase/server.ts        # Server Supabase client
  types.ts                  # Shared TypeScript types
```

## Design

Memphis/neo-brutalist aesthetic:
- Cream background (`#F4EFE4`), paper cards (`#FDFAF5`), ink text (`#111111`)
- Orange accent (`#D4541A`), mustard (`#E2B40`), teal (`#2B7A72`)
- Font: Century Gothic / Trebuchet MS
- Cards: 2px solid border + `4px 4px 0 #111111` box-shadow; hover shifts card
- Active tab: orange underline + orange text
- Custom Tailwind colors defined in `globals.css` via `@theme`: `bg-cream`, `text-ink`, `text-orange`, `bg-mustard`, `bg-teal`, `bg-mpink`, `bg-mblue`

## Key Implementation Notes

- `winner_id` from ESPN is unreliable — `MatchCard` derives winner from set counts when `winner_id` is null
- Walkovers: completed matches with `score = null`; show "W/O" badge and highlight winner if `winner_id` is set
- Country flags: nationality name → ISO alpha-2 → Unicode regional indicator emoji (lookup table in `MatchCard.tsx`)
- Supabase Realtime fires on upsert; `LiveScoresFeed` merges updates into local state via `upsertMatch()`
- Doubles matches filtered out in worker by checking for "TBD"/"Unknown" player names
