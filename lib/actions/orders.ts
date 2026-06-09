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

export async function saveTrackingCode(id: string, code: string) {
  const supabase = await createClient()
  await supabase
    .from('orders')
    .update({ tracking_code: code || null, bijgewerkt_op: new Date().toISOString() })
    .eq('id', id)
}

export async function deleteOrder(id: string) {
  const supabase = await createClient()
  await supabase.from('order_regels').delete().eq('order_id', id)
  await supabase.from('orders').delete().eq('id', id)
}

export async function bulkDeleteOrders(ids: string[]) {
  const supabase = await createClient()
  await supabase.from('order_regels').delete().in('order_id', ids)
  await supabase.from('orders').delete().in('id', ids)
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
