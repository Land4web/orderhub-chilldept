'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getOrders } from '@/lib/db/orders'
import { getSyncLogs } from '@/lib/db/sync-logs'
import { STATUS_LABEL, STATUS_STYLE, CHANNEL_STYLE, SYNC_STYLE, SYNC_LABEL } from '@/lib/styles'
import { ShoppingCart, TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { Order, SyncLog, SyncStatus, Kanaal } from '@/lib/types'

function SyncStatusIcon({ status }: { status: SyncStatus }) {
  if (status === 'success') return <CheckCircle size={14} className="text-[#16A34A]" />
  if (status === 'warning') return <AlertCircle size={14} className="text-[#D97706]" />
  return <XCircle size={14} className="text-[#EF4444]" />
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])

  useEffect(() => {
    getOrders().then(setOrders)
    getSyncLogs().then(setSyncLogs)
  }, [])

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.aangemaaktOp).getTime() - new Date(a.aangemaaktOp).getTime())
    .slice(0, 8)

  const totalOrders = orders.length
  const today = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.filter(o => o.aangemaaktOp.startsWith(today)).length
  const pendingOrders = orders.filter(o => ['new', 'processing', 'ready_to_ship'].includes(o.status)).length
  const totalRevenue = orders
    .filter(o => !['cancelled', 'failed'].includes(o.status))
    .reduce((sum, o) => sum + o.totaal, 0)

  const actionItems = orders.filter(o =>
    o.status === 'new' || o.status === 'failed' || (o.status === 'ready_to_ship' && !o.trackingCode)
  )

  const channels: Kanaal[] = ['WooCommerce', 'bol.com', 'Mirakl', 'eBay']
  const channelStatus = channels.map(kanaal => {
    const logs = syncLogs.filter(l => l.kanaal === kanaal).sort(
      (a, b) => new Date(b.uitgevoerdOp).getTime() - new Date(a.uitgevoerdOp).getTime()
    )
    const latest = logs[0]
    const hasError = logs.some(l => l.status === 'error')
    const hasWarning = logs.some(l => l.status === 'warning')
    const overallStatus: SyncStatus = hasError ? 'error' : hasWarning ? 'warning' : 'success'
    return { kanaal, latest, overallStatus }
  })

  return (
    <div className="py-7 px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#111827]">Dashboard</h1>
        <p className="text-base text-[#9CA3AF] mt-0.5">Overzicht van vandaag</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-medium text-[#6B7280]">Orders vandaag</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingCart size={13} className="text-blue-600" />
            </div>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{todayOrders}</p>
          <p className="text-[12px] text-[#6B7280]">{totalOrders} totaal</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-medium text-[#6B7280]">Omzet (actief)</span>
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp size={13} className="text-green-600" />
            </div>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">
            €{totalRevenue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[12px] text-[#6B7280]">Excl. geannuleerd/mislukt</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-medium text-[#6B7280]">Te verwerken</span>
            <div className="w-7 h-7 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock size={13} className="text-yellow-600" />
            </div>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{pendingOrders}</p>
          <p className="text-[12px] text-[#6B7280]">Nieuw + verwerking + klaar</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-medium text-[#6B7280]">Actie vereist</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle size={13} className="text-red-500" />
            </div>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{actionItems.length}</p>
          <p className="text-[12px] text-[#6B7280]">Orders die aandacht vragen</p>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] mb-3.5">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB]">
          <h2 className="text-[16px] font-semibold text-[#111827]">Recente orders</h2>
          <Link href="/orders" className="text-[15px] text-[#E8A000] font-medium hover:underline">
            Alle orders
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap">Order</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Klant</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden sm:table-cell">Kanaal</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden md:table-cell">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-[15px] text-[#9CA3AF]">Laden…</td></tr>
              ) : recentOrders.map(order => (
                <tr key={order.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/orders/${order.id}`} className="font-medium text-[#111827] hover:text-[#E8A000] transition-colors text-[15.5px]">
                      {order.id}
                    </Link>
                    <p className="text-[12px] text-[#9CA3AF] mt-0.5">{formatDate(order.aangemaaktOp)}</p>
                  </td>
                  <td className="px-4 py-2.5 text-[15.5px] text-[#374151]">{order.klantNaam}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${CHANNEL_STYLE[order.kanaal]}`}>
                      {order.kanaal}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${STATUS_STYLE[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[15.5px] font-medium text-[#111827] hidden md:table-cell">
                    €{order.totaal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row: kanaalstatus + actiecentrum */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Kanaalstatus */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Kanaalstatus</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {channelStatus.map(({ kanaal, latest, overallStatus }) => (
              <div key={kanaal} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <SyncStatusIcon status={overallStatus} />
                  <div>
                    <p className="text-[15.5px] font-medium text-[#111827]">{kanaal}</p>
                    {latest && (
                      <p className="text-[12px] text-[#9CA3AF]">{latest.bericht.slice(0, 48)}{latest.bericht.length > 48 ? '…' : ''}</p>
                    )}
                  </div>
                </div>
                <span className={`text-[12px] font-medium px-2 py-0.5 rounded ${SYNC_STYLE[overallStatus]}`}>
                  {SYNC_LABEL[overallStatus]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actiecentrum */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Actiecentrum</h2>
          </div>
          {actionItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
              <p className="text-[15.5px] text-[#9CA3AF]">Geen acties vereist</p>
            </div>
          ) : (
            <ul className="list-none">
              {actionItems.slice(0, 6).map(order => (
                <li key={order.id} className="border-b border-[#F3F4F6] last:border-0">
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-start gap-2.5 px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      order.status === 'failed' ? 'bg-red-50' : 'bg-yellow-50'
                    }`}>
                      <AlertTriangle size={13} className={order.status === 'failed' ? 'text-red-500' : 'text-yellow-500'} />
                    </div>
                    <div>
                      <p className="text-[15.5px] font-medium text-[#111827]">{order.id}</p>
                      <p className="text-[12.5px] text-[#9CA3AF]">{order.klantNaam} — {STATUS_LABEL[order.status]}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
