import type { Order, OrderRegel } from '@/lib/types'

interface MiraklAddress {
  firstname: string; lastname: string; street_1: string
  zip_code: string; city: string; country_iso_code: string; phone?: string
}
interface MiraklCustomer { email: string; phone?: string }
interface MiraklOrderLine {
  offer_sku: string; offer_title: string; quantity: number
  unit_price: number; price: number
}
interface MiraklOrder {
  order_id: string; order_state: string; customer: MiraklCustomer
  shipping_address: MiraklAddress; order_lines: MiraklOrderLine[]
  total_price: number
  order_date: string; last_updated_date: string
}
interface MiraklResponse { orders: MiraklOrder[]; total_count: number }

const STATUS_MAP: Record<string, Order['status']> = {
  WAITING_ACCEPTANCE: 'new', STAGING: 'processing',
  SHIPPING: 'ready_to_ship', RECEIVED: 'completed',
  REFUSED: 'cancelled', REFUNDED: 'returned',
  CLOSED: 'completed', INCIDENT_OPEN: 'processing', INCIDENT_CLOSED: 'processing',
}

export async function fetchMiraklOrders(url: string, apiKey: string): Promise<MiraklOrder[]> {
  const base = url.replace(/\/$/, '')
  const states = 'WAITING_ACCEPTANCE,STAGING,SHIPPING,RECEIVED,REFUSED,REFUNDED,CLOSED,INCIDENT_OPEN,INCIDENT_CLOSED'
  const all: MiraklOrder[] = []
  const pageSize = 100
  let start = 0

  while (true) {
    const res = await fetch(
      `${base}/api/orders?order_states=${states}&max=${pageSize}&start=${start}`,
      { headers: { Authorization: apiKey }, cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`Mirakl API fout: ${res.status} ${res.statusText}`)
    const data: MiraklResponse = await res.json()
    const orders = data.orders ?? []
    all.push(...orders)
    if (all.length >= data.total_count || orders.length < pageSize) break
    start += pageSize
  }

  return all
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
      notities: null,
      afasIngevoerdOp: null,
      trackingCode: null,
      klantTelefoon: addr.phone || m.customer.phone || null,
      aangemaaktOp: new Date(m.order_date).toISOString(),
      bijgewerktOp: new Date(m.last_updated_date).toISOString(),
    },
    regels,
  }
}
