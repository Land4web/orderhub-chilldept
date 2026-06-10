import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchWooCommerceProducts, mapWCProduct } from '@/lib/sync/woocommerce-products'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function POST(
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

  if (!configRow || configRow.type !== 'woocommerce') {
    return Response.json({ error: 'Geen WooCommerce kanaal geconfigureerd' }, { status: 400 })
  }

  const config = configRow.config as Record<string, string>
  let verwerkt = 0
  let fouten = 0

  try {
    const rawProducts = await fetchWooCommerceProducts(config.url, config.consumer_key, config.consumer_secret, config.taal || undefined)

    let lastError = ''
    for (const raw of rawProducts) {
      try {
        const mapped = mapWCProduct(raw, kanaalNaam)
        if (!mapped.sku) { fouten++; continue }

        const { data: existing } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('sku', mapped.sku)
          .single()

        const productId = existing?.id ?? crypto.randomUUID()

        const { error: productErr } = await supabaseAdmin.from('products').upsert({
          id: productId,
          sku: mapped.sku,
          naam: mapped.naam,
          categorie: mapped.categorie,
          verkoopprijs: mapped.verkoopprijs,
          inkoopprijs: mapped.inkoopprijs,
          gewicht: mapped.gewicht,
          actief: mapped.actief,
          kanalen: mapped.kanalen,
        }, { onConflict: 'id' })
        if (productErr) throw new Error(productErr.message)

        const { error: voorraadErr } = await supabaseAdmin.from('voorraad').upsert({
          sku: mapped.sku,
          beschikbaar: mapped.beschikbaar,
          gereserveerd: 0,
          minimum_drempel: mapped.minimumDrempel,
          locatie: mapped.locatie,
        }, { onConflict: 'sku' })
        if (voorraadErr) throw new Error(voorraadErr.message)

        verwerkt++
      } catch (e) {
        fouten++
        lastError = e instanceof Error ? e.message : String(e)
      }
    }

    const resultMsg = verwerkt > 0
      ? `${verwerkt} producten geïmporteerd${fouten > 0 ? ` · ${fouten} fouten: ${lastError}` : ''}`
      : `Alle ${fouten} producten mislukt: ${lastError}`

    return Response.json({ verwerkt, fouten, totaal: rawProducts.length, bericht: resultMsg })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Import mislukt' }, { status: 500 })
  }
}
