import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchWooCommerceOrders, mapWCOrder } from '@/lib/sync/woocommerce'
import { fetchMiraklOrders, mapMiraklOrder } from '@/lib/sync/mirakl'

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  return !!(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)
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
    totaal: order.totaal, notities: order.notities,
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

async function syncKanaal(kanaalNaam: string, type: string, config: Record<string, string>) {
  let verwerkt = 0
  let fouten = 0
  const logId = crypto.randomUUID()
  try {
    const rawOrders = type === 'woocommerce'
      ? await fetchWooCommerceOrders(config.url, config.consumer_key, config.consumer_secret)
      : await fetchMiraklOrders(config.url, config.api_key)

    for (const raw of rawOrders) {
      try {
        const { order, regels } = type === 'woocommerce'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? mapWCOrder(raw as any, kanaalNaam)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : mapMiraklOrder(raw as any, kanaalNaam)
        await upsertOrder(order, regels)
        verwerkt++
      } catch { fouten++ }
    }

    const bericht = verwerkt > 0 ? `${verwerkt} orders verwerkt` : 'Geen nieuwe orders'
    const status = fouten > 0 && verwerkt === 0 ? 'error' : fouten > 0 ? 'warning' : 'success'
    await supabaseAdmin.from('sync_logs').insert({
      id: logId, kanaal: kanaalNaam, type: 'orders', status,
      aantal_verwerkt: verwerkt, aantal_fouten: fouten,
      bericht, uitgevoerd_op: new Date().toISOString(),
    })
    return { kanaal: kanaalNaam, verwerkt, fouten, status }
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Onbekende fout'
    try {
      await supabaseAdmin.from('sync_logs').insert({
        id: logId, kanaal: kanaalNaam, type: 'orders', status: 'error',
        aantal_verwerkt: 0, aantal_fouten: 1, bericht,
        uitgevoerd_op: new Date().toISOString(),
      })
    } catch { /* ignore */ }
    return { kanaal: kanaalNaam, verwerkt: 0, fouten: 1, status: 'error' }
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: kanalen } = await supabaseAdmin
    .from('kanaal_config')
    .select('kanaal, type, config')

  if (!kanalen?.length) {
    return Response.json({ bericht: 'Geen kanalen geconfigureerd' })
  }

  const results = await Promise.allSettled(
    kanalen.map(r => syncKanaal(r.kanaal, r.type, r.config as Record<string, string>))
  )

  return Response.json({ results: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error' }) })
}
