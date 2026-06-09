'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface ProductFormData {
  id?: string
  sku: string
  naam: string
  categorie: string
  verkoopprijs: number
  inkoopprijs: number
  gewicht: number
  actief: boolean
  kanalen?: string[]
  beschikbaar: number
  gereserveerd: number
  minimumDrempel: number
  locatie: string
}

export async function saveProduct(data: ProductFormData): Promise<{ error?: string }> {
  try {
    const id = data.id ?? crypto.randomUUID()
    const { error: pErr } = await supabaseAdmin.from('products').upsert({
      id,
      sku: data.sku,
      naam: data.naam,
      categorie: data.categorie,
      verkoopprijs: data.verkoopprijs,
      inkoopprijs: data.inkoopprijs,
      gewicht: data.gewicht,
      actief: data.actief,
      kanalen: data.kanalen ?? [],
    }, { onConflict: 'id' })
    if (pErr) return { error: pErr.message }

    const { error: vErr } = await supabaseAdmin.from('voorraad').upsert({
      sku: data.sku,
      beschikbaar: data.beschikbaar,
      gereserveerd: data.gereserveerd,
      minimum_drempel: data.minimumDrempel,
      locatie: data.locatie,
    }, { onConflict: 'sku' })
    if (vErr) return { error: vErr.message }

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Opslaan mislukt' }
  }
}

export async function deleteProduct(id: string, sku: string): Promise<{ error?: string }> {
  try {
    await supabaseAdmin.from('voorraad').delete().eq('sku', sku)
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Verwijderen mislukt' }
  }
}
