import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, phone, message } = body
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('signup_requests')
      .insert([{ name, email, phone: phone ?? null, message: message ?? null }])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
