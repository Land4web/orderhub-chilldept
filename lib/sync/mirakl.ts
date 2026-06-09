import type { Order, OrderRegel, Vervoerder } from '@/lib/types'

interface MiraklAddress {
  firstname: string; lastname: string; street_1: string
  zip_code: string; city: string; country_iso_code: string
}
interface MiraklCustomer { email: string }
interface MiraklOrderLine {
  offer_sku: string; offer_title: string; quantity: number
  unit_price: number; price: number
}
interface MiraklOrder {
  order_id: string; order_state: string; customer: MiraklCustomer
  shipping_address: MiraklAddress; order_lines: MiraklOrderLine[]
  total_price: number; shipping_company: string | null; shipping_tracking: string | null
  order_date: string; last_updated_date: string
}
interface MiraklResponse { orders: MiraklOrder[]; total_count: number }

const STATUS_MAP: Record<string, Order['status']> = {
  WAITING_ACCEPTANCE: 'new', STAGING: 'processing',
  SHIPPING: 'ready_to_ship', RECEIVED: 'completed',
  REFUSED: 'cancelled', REFUNDED: 'returned',
  CLOSED: 'completed', INCIDENT_OPEN: 'processing', INCIDENT_CLOSED: 'processing',
}

function detectVervoerder(company: string | null): Vervoerder | null {
  if (!company) return null
  const c = company.toLowerCase()
  if (c.includes('dhl')) return 'DHL'
  if (c.includes('postnl')) return 'PostNL'
  if (c.includes('dpd')) return 'DPD'
  if (c.includes('gls')) return 'GLS'
  return null
}

export async function fetchMiraklOrders(url: string, apiKey: string): Promise<MiraklOrder[]> {
  const base = url.replace(/\/$/, '')
  const states = 'WAITING_ACCEPTANCE,STAGING,SHIPPING,RECEIVED,REFUSED,REFUNDED'
  const res = await fetch(
    `${base}/api/orders?order_states=${states}&max=50&start=0`,
    { headers: { Authorization: apiKey }, cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`Mirakl API fout: ${res.status} ${res.statusText}`)
  const data: MiraklResponse = await res.json()
  return data.orders ?? []
}

export function mapMiraklOrder(m: MiraklOrder, kanaal = 'Mirakl'): { order: Omit<Order, 'regels'>; regels: OrderRegel[] } {
  const addr = m.shipping_address
  const regels: OrderRegel[] = m.order_lines.map(li => ({
    sku: li.offer_sku,
    naam: li.offer_title,
    aantal: li.quantity,
    prijs: li.unit_price,
  }))
  return {
    order: {
      id: `MIR-${m.order_id}`,
      kanaal,
      kanaalOrderId: m.order_id,
      status: STATUS_MAP[m.order_state] ?? 'new',
      afasStatus: 'not_entered',
      klantNaam: `${addr.firstname} ${addr.lastname}`.trim(),
      klantEmail: m.customer.email,
      klantAdres: addr.street_1,
      klantPostcode: addr.zip_code,
      klantStad: addr.city,
      klantLand: addr.country_iso_code,
      totaal: m.total_price,
      vervoerder: detectVervoerder(m.shipping_company),
      trackingCode: m.shipping_tracking ?? null,
      notities: null,
      afasIngevoerdOp: null,
      aangemaaktOp: new Date(m.order_date).toISOString(),
      bijgewerktOp: new Date(m.last_updated_date).toISOString(),
    },
    regels,
  }
}
