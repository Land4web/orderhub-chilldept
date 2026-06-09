'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { KanaalConfigRow, KanaalType } from '@/lib/types'

export async function getAllKanaalConfigs(): Promise<KanaalConfigRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('kanaal_config')
      .select('kanaal, type, config')
      .order('kanaal')
    return (data ?? []) as KanaalConfigRow[]
  } catch {
    return []
  }
}

export async function getKanaalConfig(kanaal: string): Promise<Record<string, string>> {
  try {
    const { data } = await supabaseAdmin
      .from('kanaal_config')
      .select('config')
      .eq('kanaal', kanaal)
      .single()
    return (data?.config as Record<string, string>) ?? {}
  } catch {
    return {}
  }
}

export async function saveKanaalConfig(
  kanaal: string,
  type: KanaalType,
  config: Record<string, string>
): Promise<{ error?: string }> {
  try {
    await supabaseAdmin
      .from('kanaal_config')
      .upsert({ kanaal, type, config, bijgewerkt_op: new Date().toISOString() })
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Opslaan mislukt' }
  }
}

export async function deleteKanaalConfig(kanaal: string): Promise<{ error?: string }> {
  try {
    await supabaseAdmin.from('kanaal_config').delete().eq('kanaal', kanaal)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Verwijderen mislukt' }
  }
}
