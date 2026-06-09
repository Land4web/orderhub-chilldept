'use server'

import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types'

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const supabase = await createClient()
  await supabase
    .from('orders')
    .update({ status, bijgewerkt_op: new Date().toISOString() })
    .eq('id', id)
}

export async function saveNote(id: string, notities: string) {
  const supabase = await createClient()
  await supabase
    .from('orders')
    .update({ notities: notities || null, bijgewerkt_op: new Date().toISOString() })
    .eq('id', id)
}

export async function toggleAfasStatus(id: string, newStatus: 'not_entered' | 'entered') {
  const supabase = await createClient()
  await supabase
    .from('orders')
    .update({
      afas_status: newStatus,
      afas_ingevoerd_op: newStatus === 'entered' ? new Date().toISOString() : null,
      bijgewerkt_op: new Date().toISOString(),
    })
    .eq('id', id)
}

export async function bulkUpdateStatus(ids: string[], status: OrderStatus) {
  const supabase = await createClient()
  await supabase
    .from('orders')
    .update({ status, bijgewerkt_op: new Date().toISOString() })
    .in('id', ids)
}

export async function bulkMarkAfas(ids: string[]) {
  const supabase = await createClient()
  await supabase
    .from('orders')
    .update({
      afas_status: 'entered',
      afas_ingevoerd_op: new Date().toISOString(),
      bijgewerkt_op: new Date().toISOString(),
    })
    .in('id', ids)
}
