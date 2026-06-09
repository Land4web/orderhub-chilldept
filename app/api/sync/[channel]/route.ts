import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchWooCommerceOrders, mapWCOrder } from '@/lib/sync/woocommerce'
import { fetchMiraklOrders, mapMiraklOrder } from '@/lib/sync/mirakl'

const CHANNEL_NAMES: Record<string, string> = {
  woocommerce: 'WooCommerce',
  mirakl: 'Mirakl',
}

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
  await supabaseAdmin.from('orders').upsert({
    id: order.id, kanaal: order.kanaal, kanaal_order_id: order.kanaalOrderId,
    status: order.status, afas_status: order.afasStatus,
    klant_naam: order.klantNaam, klant_email: order.klantEmail,
    klant_adres: order.klantAdres, klant_postcode: order.klantPostcode,
    klant_stad: order.klantStad, klant_land: order.klantLand,
    totaal: order.totaal, vervoerder: order.vervoerder,
    tracking_code: order.trackingCode, notities: order.notities,
    afas_ingevoerd_op: order.afasIngevoerdOp,
    aangemaakt_op: order.aangemaaktOp, bijgewerkt_op: order.bijgewerktOp,
  }, { onConflict: 'id' })

  await supabaseAdmin.from('order_regels').delete().eq('order_id', order.id)
  if (regels.length > 0) {
    await supabaseAdmin.from('order_regels').insert(
      regels.map(r => ({ order_id: order.id, sku: r.sku, naam: r.naam, aantal: r.aantal, prijs: r.prijs }))
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params

  if (!CHANNEL_NAMES[channel]) {
    return Response.json({ error: 'Onbekend kanaal' }, { status: 400 })
  }
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const kanaal = CHANNEL_NAMES[channel]
  const { data: configRow } = await supabaseAdmin
    .from('kanaal_config')
    .select('config')
    .eq('kanaal', kanaal)
    .single()

  if (!configRow?.config) {
    return Response.json({ error: `Geen credentials geconfigureerd voor ${kanaal}` }, { status: 400 })
  }

  const config = configRow.config as Record<string, string>
  let verwerkt = 0
  let fouten = 0
  const logId = crypto.randomUUID()

  try {
    const rawOrders = channel === 'woocommerce'
      ? await fetchWooCommerceOrders(config.url, config.consumer_key, config.consumer_secret)
      : await fetchMiraklOrders(config.url, config.api_key)

    const mapper = channel === 'woocommerce' ? mapWCOrder : mapMiraklOrder

    for (const raw of rawOrders) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { order, regels } = mapper(raw as any)
        await upsertOrder(order, regels)
        verwerkt++
      } catch {
        fouten++
      }
    }

    const bericht = verwerkt > 0 ? `${verwerkt} orders verwerkt` : 'Geen nieuwe orders'
    const status = fouten > 0 && verwerkt === 0 ? 'error' : fouten > 0 ? 'warning' : 'success'

    await supabaseAdmin.from('sync_logs').insert({
      id: logId, kanaal, type: 'orders', status,
      aantal_verwerkt: verwerkt, aantal_fouten: fouten,
      bericht, uitgevoerd_op: new Date().toISOString(),
    })

    return Response.json({ verwerkt, fouten, bericht, status })
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Onbekende fout'
    try {
      await supabaseAdmin.from('sync_logs').insert({
        id: logId, kanaal, type: 'orders', status: 'error',
        aantal_verwerkt: 0, aantal_fouten: 1,
        bericht, uitgevoerd_op: new Date().toISOString(),
      })
    } catch { /* ignore logging failure */ }
    return Response.json({ error: bericht }, { status: 500 })
  }
}
