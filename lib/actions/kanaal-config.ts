'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getKanaalConfig(kanaal: string): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin
    .from('kanaal_config')
    .select('config')
    .eq('kanaal', kanaal)
    .single()
  return (data?.config as Record<string, string>) ?? {}
}

export async function saveKanaalConfig(
  kanaal: string,
  config: Record<string, string>
): Promise<void> {
  await supabaseAdmin
    .from('kanaal_config')
    .upsert({ kanaal, config, bijgewerkt_op: new Date().toISOString() })
}
