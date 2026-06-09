import { supabase } from '@/lib/supabase/client'
import type { Order, OrderRegel } from '@/lib/types'

function mapOrder(row: Record<string, unknown>, regels: OrderRegel[]): Order {
  return {
    id: row.id as string,
    kanaal: row.kanaal as Order['kanaal'],
    kanaalOrderId: row.kanaal_order_id as string,
    status: row.status as Order['status'],
    afasStatus: row.afas_status as Order['afasStatus'],
    klantNaam: row.klant_naam as string,
    klantEmail: row.klant_email as string,
    klantAdres: row.klant_adres as string,
    klantPostcode: row.klant_postcode as string,
    klantStad: row.klant_stad as string,
    klantLand: row.klant_land as string,
    regels,
    totaal: Number(row.totaal),
    notities: (row.notities as string) ?? null,
    afasIngevoerdOp: (row.afas_ingevoerd_op as string) ?? null,
    trackingCode: (row.tracking_code as string) ?? null,
    klantTelefoon: (row.klant_telefoon as string) ?? null,
    aangemaaktOp: row.aangemaakt_op as string,
    bijgewerktOp: row.bijgewerkt_op as string,
  }
}

export async function getOrders(): Promise<Order[]> {
  const { data: orderRows, error } = await supabase
    .from('orders')
    .select('*, order_regels(*)')
    .order('aangemaakt_op', { ascending: false })

  if (error || !orderRows) return []

  return orderRows.map(row => {
    const regels: OrderRegel[] = (row.order_regels ?? []).map((r: Record<string, unknown>) => ({
      sku: r.sku as string,
      naam: r.naam as string,
      aantal: r.aantal as number,
      prijs: Number(r.prijs),
    }))
    return mapOrder(row, regels)
  })
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data: row, error } = await supabase
    .from('orders')
    .select('*, order_regels(*)')
    .eq('id', id)
    .single()

  if (error || !row) return null

  const regels: OrderRegel[] = (row.order_regels ?? []).map((r: Record<string, unknown>) => ({
    sku: r.sku as string,
    naam: r.naam as string,
    aantal: r.aantal as number,
    prijs: Number(r.prijs),
  }))

  return mapOrder(row, regels)
}
