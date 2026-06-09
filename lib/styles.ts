import type { OrderStatus, Kanaal, SyncStatus } from '@/lib/types'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Nieuw',
  processing: 'In verwerking',
  ready_to_ship: 'Klaar voor verzending',
  shipped: 'Verzonden',
  completed: 'Afgerond',
  cancelled: 'Geannuleerd',
  returned: 'Retour',
  failed: 'Mislukt',
}

export const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'bg-[#EFF6FF] text-[#3B82F6]',
  processing: 'bg-[#FFF7ED] text-[#F59E0B]',
  ready_to_ship: 'bg-[#F0FDF4] text-[#22C55E] border border-[#BBF7D0]',
  shipped: 'bg-[#F5F3FF] text-[#8B5CF6]',
  completed: 'bg-[#F0FDF4] text-[#16A34A]',
  cancelled: 'bg-[#F9FAFB] text-[#9CA3AF]',
  returned: 'bg-[#FFF7ED] text-[#EA580C]',
  failed: 'bg-[#FEF2F2] text-[#EF4444]',
}

export const CHANNEL_STYLE: Record<Kanaal, string> = {
  WooCommerce: 'bg-[#F5F3FF] text-[#7C3AED]',
  'bol.com': 'bg-[#EFF6FF] text-[#2563EB]',
  Mirakl: 'bg-[#FFF7ED] text-[#D97706]',
  eBay: 'bg-[#F0FDF4] text-[#059669]',
}

export const SYNC_STYLE: Record<SyncStatus, string> = {
  success: 'bg-[#F0FDF4] text-[#16A34A]',
  warning: 'bg-[#FFFBEB] text-[#D97706]',
  error: 'bg-[#FEF2F2] text-[#EF4444]',
}

export const SYNC_LABEL: Record<SyncStatus, string> = {
  success: 'OK',
  warning: 'Waarschuwing',
  error: 'Fout',
}
