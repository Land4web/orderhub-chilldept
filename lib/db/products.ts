import { supabase } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('naam')

  if (error || !data) return []

  return data.map(row => ({
    id: row.id as string,
    sku: row.sku as string,
    naam: row.naam as string,
    categorie: row.categorie as string,
    inkoopprijs: Number(row.inkoopprijs),
    verkoopprijs: Number(row.verkoopprijs),
    gewicht: Number(row.gewicht),
    actief: row.actief as boolean,
    kanalen: (row.kanalen ?? []) as Product['kanalen'],
  }))
}
