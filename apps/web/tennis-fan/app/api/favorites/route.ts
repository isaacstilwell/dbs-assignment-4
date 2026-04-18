import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await serviceClient()
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { player_id, player_name } = await req.json()
    const { error } = await serviceClient().from('user_favorites').upsert(
      { user_id: userId, player_id, player_name },
      { onConflict: 'user_id,player_id' }
    )
    if (error) {
      console.error('[api/favorites POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/favorites POST] unhandled:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { player_id } = await req.json()
    const { error } = await serviceClient()
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('player_id', player_id)
    if (error) {
      console.error('[api/favorites DELETE]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/favorites DELETE] unhandled:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
