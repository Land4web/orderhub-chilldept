import { supabase } from '@/lib/supabase/client'
import type { Voorraad } from '@/lib/types'

export async function getVoorraad(): Promise<Voorraad[]> {
  const { data, error } = await supabase
    .from('voorraad')
    .select('*')

  if (error || !data) return []

  return data.map(row => ({
    sku: row.sku as string,
    beschikbaar: row.beschikbaar as number,
    gereserveerd: row.gereserveerd as number,
    minimumDrempel: row.minimum_drempel as number,
    locatie: row.locatie as string,
  }))
}
