import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Load .env.local manually
try {
  const env = readFileSync('.env.local', 'utf8')
  for (const line of env.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
} catch {}

import { orders } from '../lib/mock-data/orders'
import { products } from '../lib/mock-data/products'
import { voorraad } from '../lib/mock-data/voorraad'
import { syncLogs } from '../lib/mock-data/sync-logs'
import { afasChecks } from '../lib/mock-data/afas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = [
  { email: 'maarten@chill-dept.nl', password: 'admin123', name: 'Maarten Land', initials: 'ML', role: 'admin' },
  { email: 'collega@chill-dept.nl', password: 'collega123', name: 'Collega Naam', initials: 'CN', role: 'employee' },
  { email: 'orders@fulfillment-partner.nl', password: 'partner123', name: 'Fulfillment Partner', initials: 'FP', role: 'fulfillment' },
]

async function seed() {
  console.log('Seeding users...')
  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })
    if (error && !error.message.includes('already been registered')) {
      console.error(`Failed to create user ${u.email}:`, error.message)
      continue
    }
    const userId = data?.user?.id
    if (!userId) {
      // User already exists — look it up
      const { data: existing } = await supabase.auth.admin.listUsers()
      const found = existing?.users?.find(x => x.email === u.email)
      if (!found) { console.warn(`Could not resolve user ID for ${u.email}`); continue }
      await supabase.from('profiles').upsert({ id: found.id, name: u.name, initials: u.initials, role: u.role, email: u.email })
    } else {
      await supabase.from('profiles').upsert({ id: userId, name: u.name, initials: u.initials, role: u.role, email: u.email })
    }
    console.log(`  ✓ ${u.email}`)
  }

  console.log('Seeding orders...')
  for (const order of orders) {
    const { regels, ...rest } = order
    const { error } = await supabase.from('orders').upsert({
      id: rest.id,
      kanaal: rest.kanaal,
      kanaal_order_id: rest.kanaalOrderId,
      status: rest.status,
      afas_status: rest.afasStatus,
      klant_naam: rest.klantNaam,
      klant_email: rest.klantEmail,
      klant_adres: rest.klantAdres,
      klant_postcode: rest.klantPostcode,
      klant_stad: rest.klantStad,
      klant_land: rest.klantLand,
      totaal: rest.totaal,
      notities: rest.notities,
      afas_ingevoerd_op: rest.afasIngevoerdOp ?? null,
      tracking_code: rest.trackingCode ?? null,
      klant_telefoon: rest.klantTelefoon ?? null,
      aangemaakt_op: rest.aangemaaktOp,
      bijgewerkt_op: rest.bijgewerktOp,
    })
    if (error) { console.error(`  Order ${rest.id}:`, error.message); continue }

    await supabase.from('order_regels').delete().eq('order_id', rest.id)
    await supabase.from('order_regels').insert(
      regels.map(r => ({ order_id: rest.id, sku: r.sku, naam: r.naam, aantal: r.aantal, prijs: r.prijs }))
    )
    console.log(`  ✓ ${rest.id}`)
  }

  console.log('Seeding products...')
  const { error: pErr } = await supabase.from('products').upsert(
    products.map(p => ({
      id: p.id,
      sku: p.sku,
      naam: p.naam,
      categorie: p.categorie,
      inkoopprijs: p.inkoopprijs,
      verkoopprijs: p.verkoopprijs,
      gewicht: p.gewicht,
      actief: p.actief,
      kanalen: p.kanalen,
    }))
  )
  if (pErr) console.error('Products error:', pErr.message)
  else console.log(`  ✓ ${products.length} products`)

  console.log('Seeding voorraad...')
  const { error: vErr } = await supabase.from('voorraad').upsert(
    voorraad.map(v => ({
      sku: v.sku,
      beschikbaar: v.beschikbaar,
      gereserveerd: v.gereserveerd,
      minimum_drempel: v.minimumDrempel,
      locatie: v.locatie,
    }))
  )
  if (vErr) console.error('Voorraad error:', vErr.message)
  else console.log(`  ✓ ${voorraad.length} voorraad rows`)

  console.log('Seeding sync logs...')
  const { error: sErr } = await supabase.from('sync_logs').upsert(
    syncLogs.map(l => ({
      id: l.id,
      kanaal: l.kanaal,
      type: l.type,
      status: l.status,
      aantal_verwerkt: l.aantalVerwerkt,
      aantal_fouten: l.aantalFouten,
      bericht: l.bericht,
      uitgevoerd_op: l.uitgevoerdOp,
    }))
  )
  if (sErr) console.error('Sync logs error:', sErr.message)
  else console.log(`  ✓ ${syncLogs.length} sync logs`)

  console.log('Seeding AFAS checks...')
  const { error: aErr } = await supabase.from('afas_checks').upsert(
    afasChecks.map(c => ({
      id: c.id,
      order_id: c.orderId,
      klant_naam: c.klantNaam,
      kanaal: c.kanaal,
      bedrag: c.bedrag,
      afas_status: c.afasStatus,
      foutmelding: c.foutmelding,
      gecontroleerd_op: c.gecontroleerOp,
    }))
  )
  if (aErr) console.error('AFAS checks error:', aErr.message)
  else console.log(`  ✓ ${afasChecks.length} AFAS checks`)

  console.log('\nDone!')
}

seed().catch(console.error)
