import { supabase } from '@/lib/supabase/client'
import type { SyncLog } from '@/lib/types'

export async function getSyncLogs(): Promise<SyncLog[]> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('uitgevoerd_op', { ascending: false })

  if (error || !data) return []

  return data.map(row => ({
    id: row.id as string,
    kanaal: row.kanaal as SyncLog['kanaal'],
    type: row.type as SyncLog['type'],
    status: row.status as SyncLog['status'],
    aantalVerwerkt: row.aantal_verwerkt as number,
    aantalFouten: row.aantal_fouten as number,
    bericht: row.bericht as string,
    uitgevoerdOp: row.uitgevoerd_op as string,
  }))
}
