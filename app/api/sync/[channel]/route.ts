import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchWooCommerceOrders, mapWCOrder } from '@/lib/sync/woocommerce'
import { fetchMiraklOrders, mapMiraklOrder } from '@/lib/sync/mirakl'

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin'
}

async function upsertOrder(
  order: Awaited<ReturnType<typeof mapWCOrder>>['order'],
  regels: Awaited<ReturnType<typeof mapWCOrder>>['regels']
) {
  const { error: orderErr } = await supabaseAdmin.from('orders').upsert({
    id: order.id, kanaal: order.kanaal, kanaal_order_id: order.kanaalOrderId,
    status: order.status, afas_status: order.afasStatus,
    klant_naam: order.klantNaam, klant_email: order.klantEmail,
    klant_adres: order.klantAdres, klant_postcode: order.klantPostcode,
    klant_stad: order.klantStad, klant_land: order.klantLand,
    totaal: order.totaal, notities: order.notities,
    afas_ingevoerd_op: order.afasIngevoerdOp,
    aangemaakt_op: order.aangemaaktOp, bijgewerkt_op: order.bijgewerktOp,
  }, { onConflict: 'id' })
  if (orderErr) throw new Error(orderErr.message)

  const { error: delErr } = await supabaseAdmin.from('order_regels').delete().eq('order_id', order.id)
  if (delErr) throw new Error(delErr.message)

  if (regels.length > 0) {
    const { error: regelErr } = await supabaseAdmin.from('order_regels').insert(
      regels.map(r => ({ order_id: order.id, sku: r.sku, naam: r.naam, aantal: r.aantal, prijs: r.prijs }))
    )
    if (regelErr) throw new Error(regelErr.message)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params
  const kanaalNaam = decodeURIComponent(channel)

  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: configRow } = await supabaseAdmin
    .from('kanaal_config')
    .select('type, config')
    .eq('kanaal', kanaalNaam)
    .single()

  if (!configRow?.config) {
    return Response.json({ error: `Geen credentials geconfigureerd voor ${kanaalNaam}` }, { status: 400 })
  }

  const { type, config } = configRow as { type: string; config: Record<string, string> }
  let verwerkt = 0
  let fouten = 0
  const logId = crypto.randomUUID()

  try {
    const rawOrders = type === 'woocommerce'
      ? await fetchWooCommerceOrders(config.url, config.consumer_key, config.consumer_secret)
      : await fetchMiraklOrders(config.url, config.api_key)

    let lastError = ''
    for (const raw of rawOrders) {
      try {
        const { order, regels } = type === 'woocommerce'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? mapWCOrder(raw as any, kanaalNaam)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : mapMiraklOrder(raw as any, kanaalNaam)
        await upsertOrder(order, regels)
        verwerkt++
      } catch (e) {
        fouten++
        lastError = e instanceof Error ? e.message : String(e)
      }
    }

    const bericht = verwerkt > 0
      ? `${verwerkt} orders verwerkt${fouten > 0 ? ` · ${fouten} fouten: ${lastError}` : ''}`
      : fouten > 0 ? `Alle ${fouten} orders mislukt: ${lastError}` : 'Geen nieuwe orders'
    const status = fouten > 0 && verwerkt === 0 ? 'error' : fouten > 0 ? 'warning' : 'success'

    await supabaseAdmin.from('sync_logs').insert({
      id: logId, kanaal: kanaalNaam, type: 'orders', status,
      aantal_verwerkt: verwerkt, aantal_fouten: fouten,
      bericht, uitgevoerd_op: new Date().toISOString(),
    })

    return Response.json({ verwerkt, fouten, bericht, status })
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Onbekende fout'
    try {
      await supabaseAdmin.from('sync_logs').insert({
        id: logId, kanaal: kanaalNaam, type: 'orders', status: 'error',
        aantal_verwerkt: 0, aantal_fouten: 1,
        bericht, uitgevoerd_op: new Date().toISOString(),
      })
    } catch { /* ignore logging failure */ }
    return Response.json({ error: bericht }, { status: 500 })
  }
}
