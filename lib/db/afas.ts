import { supabase } from '@/lib/supabase/client'
import type { AfasCheck } from '@/lib/types'

export async function getAfasChecks(): Promise<AfasCheck[]> {
  const { data, error } = await supabase
    .from('afas_checks')
    .select('*')
    .order('gecontroleerd_op', { ascending: false })

  if (error || !data) return []

  return data.map(row => ({
    id: row.id as string,
    orderId: row.order_id as string,
    klantNaam: row.klant_naam as string,
    kanaal: row.kanaal as AfasCheck['kanaal'],
    bedrag: Number(row.bedrag),
    afasStatus: row.afas_status as AfasCheck['afasStatus'],
    foutmelding: (row.foutmelding as string) ?? null,
    gecontroleerOp: row.gecontroleerd_op as string,
  }))
}
