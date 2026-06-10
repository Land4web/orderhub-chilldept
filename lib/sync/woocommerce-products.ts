import type { ProductFormData } from '@/lib/actions/products'

interface WCCategory { id: number; name: string }
interface WCProduct {
  id: number
  sku: string
  name: string
  type: string
  status: string
  categories: WCCategory[]
  regular_price: string
  price: string
  stock_quantity: number | null
  manage_stock: boolean
  weight: string
}

export async function fetchWooCommerceProducts(
  url: string, key: string, secret: string, lang?: string
): Promise<WCProduct[]> {
  const base = url.replace(/\/$/, '')
  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const all: WCProduct[] = []
  let page = 1

  while (true) {
    const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : ''
    const res = await fetch(
      `${base}/wp-json/wc/v3/products?status=publish&per_page=100&page=${page}${langParam}`,
      { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`WooCommerce API fout: ${res.status} ${res.statusText}`)
    const data: WCProduct[] = await res.json()
    if (!data.length) break
    all.push(...data)
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') ?? '1')
    if (page >= totalPages) break
    page++
  }

  return all
}

export function mapWCProduct(wc: WCProduct, kanaal: string): Omit<ProductFormData, 'id'> {
  return {
    sku: wc.sku || `WC-${wc.id}`,
    naam: wc.name,
    categorie: wc.categories[0]?.name ?? 'Overig',
    verkoopprijs: parseFloat(wc.regular_price || wc.price) || 0,
    inkoopprijs: 0,
    gewicht: parseFloat(wc.weight) || 0,
    actief: wc.status === 'publish',
    kanalen: [kanaal],
    beschikbaar: wc.stock_quantity ?? 0,
    gereserveerd: 0,
    minimumDrempel: 5,
    locatie: '',
  }
}
