'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

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
  config: Record<string, string>
): Promise<{ error?: string }> {
  try {
    await supabaseAdmin
      .from('kanaal_config')
      .upsert({ kanaal, config, bijgewerkt_op: new Date().toISOString() })
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Opslaan mislukt' }
  }
}
