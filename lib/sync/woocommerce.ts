import type { Order, OrderRegel } from '@/lib/types'

interface WCBilling {
  first_name: string; last_name: string; email: string; phone: string
  address_1: string; postcode: string; city: string; country: string
}
interface WCLineItem {
  sku: string; name: string; quantity: number; price: string; total: string
}
interface WCOrder {
  id: number; number: string; status: string; billing: WCBilling
  line_items: WCLineItem[]
  total: string; date_created: string; date_modified: string; customer_note: string
}

const STATUS_MAP: Record<string, Order['status']> = {
  pending: 'new', processing: 'processing', 'on-hold': 'processing',
  completed: 'completed', cancelled: 'cancelled', refunded: 'returned', failed: 'failed',
}

export async function fetchWooCommerceOrders(
  url: string, key: string, secret: string
): Promise<WCOrder[]> {
  const base = url.replace(/\/$/, '')
  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const res = await fetch(
    `${base}/wp-json/wc/v3/orders?status=any&per_page=50&orderby=modified&order=desc`,
    { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`WooCommerce API fout: ${res.status} ${res.statusText}`)
  return res.json()
}

export function mapWCOrder(wc: WCOrder, kanaal = 'WooCommerce'): { order: Omit<Order, 'regels'>; regels: OrderRegel[] } {
  const regels: OrderRegel[] = wc.line_items.map(li => ({
    sku: li.sku || `wc-${wc.number}-${li.name.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`,
    naam: li.name,
    aantal: li.quantity,
    prijs: parseFloat(li.price) || (parseFloat(li.total) / li.quantity),
  }))
  return {
    order: {
      id: `WC-${wc.number}`,
      kanaal,
      kanaalOrderId: wc.number,
      status: STATUS_MAP[wc.status] ?? 'new',
      afasStatus: 'not_entered',
      klantNaam: `${wc.billing.first_name} ${wc.billing.last_name}`.trim(),
      klantEmail: wc.billing.email,
      klantAdres: wc.billing.address_1,
      klantPostcode: wc.billing.postcode,
      klantStad: wc.billing.city,
      klantLand: wc.billing.country,
      totaal: parseFloat(wc.total),
      notities: wc.customer_note || null,
      afasIngevoerdOp: null,
      trackingCode: null,
      klantTelefoon: wc.billing.phone || null,
      aangemaaktOp: new Date(wc.date_created).toISOString(),
      bijgewerktOp: new Date(wc.date_modified).toISOString(),
    },
    regels,
  }
}
