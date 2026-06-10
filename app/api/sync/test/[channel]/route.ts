import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  if (!(await isAdmin())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { channel } = await params
  const kanaalNaam = decodeURIComponent(channel)

  const { data: configRow } = await supabaseAdmin
    .from('kanaal_config')
    .select('type, config')
    .eq('kanaal', kanaalNaam)
    .single()

  if (!configRow?.config) {
    return Response.json({ ok: false, error: 'Geen credentials opgeslagen voor dit kanaal' })
  }

  const { type, config } = configRow as { type: string; config: Record<string, string> }

  if (!config.url) {
    return Response.json({ ok: false, error: 'URL ontbreekt in de configuratie' })
  }

  const base = config.url.replace(/\/$/, '')

  try {
    if (type === 'woocommerce') {
      if (!config.consumer_key || !config.consumer_secret) {
        return Response.json({ ok: false, error: 'Consumer Key of Consumer Secret ontbreekt' })
      }
      const auth = Buffer.from(`${config.consumer_key}:${config.consumer_secret}`).toString('base64')
      const res = await fetch(
        `${base}/wp-json/wc/v3/orders?per_page=1`,
        { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' }
      )
      const text = await res.text()
      if (!res.ok) {
        let detail = ''
        try { detail = JSON.parse(text)?.message ?? text.slice(0, 200) } catch { detail = text.slice(0, 200) }
        return Response.json({
          ok: false,
          status: res.status,
          statusText: res.statusText,
          error: `HTTP ${res.status} — ${detail}`,
        })
      }
      const orders = JSON.parse(text)
      const total = parseInt(res.headers.get('x-wp-total') ?? '0')
      return Response.json({ ok: true, status: res.status, orders: orders.length, total })
    }

    if (type === 'mirakl') {
      if (!config.api_key) {
        return Response.json({ ok: false, error: 'API Key ontbreekt' })
      }
      const res = await fetch(
        `${base}/api/orders?max=1`,
        { headers: { Authorization: config.api_key }, cache: 'no-store' }
      )
      const text = await res.text()
      if (!res.ok) {
        let detail = ''
        try { detail = JSON.parse(text)?.message ?? text.slice(0, 200) } catch { detail = text.slice(0, 200) }
        return Response.json({
          ok: false,
          status: res.status,
          statusText: res.statusText,
          error: `HTTP ${res.status} — ${detail}`,
        })
      }
      return Response.json({ ok: true, status: res.status })
    }

    return Response.json({ ok: false, error: `Onbekend kanaaltype: ${type}` })
  } catch (err) {
    return Response.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Verbindingsfout',
    })
  }
}
