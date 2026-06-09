'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getOrders } from '@/lib/db/orders'
import { getSyncLogs } from '@/lib/db/sync-logs'
import { getVoorraad } from '@/lib/db/voorraad'
import { getAllKanaalConfigs } from '@/lib/actions/kanaal-config'
import { STATUS_LABEL, STATUS_STYLE, channelStyle, SYNC_STYLE, SYNC_LABEL } from '@/lib/styles'
import { ShoppingCart, TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle, AlertCircle, Package } from 'lucide-react'
import type { Order, SyncLog, SyncStatus, Voorraad } from '@/lib/types'

const CHART_COLORS = ['#7C3AED', '#2563EB', '#D97706', '#059669', '#DC2626', '#0891B2', '#9333EA', '#EA580C']

function SyncStatusIcon({ status }: { status: SyncStatus }) {
  if (status === 'success') return <CheckCircle size={14} className="text-[#16A34A]" />
  if (status === 'warning') return <AlertCircle size={14} className="text-[#D97706]" />
  return <XCircle size={14} className="text-[#EF4444]" />
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const first = name.split(' ')[0]
  if (hour < 12) return `Goedemorgen, ${first}`
  if (hour < 18) return `Goedemiddag, ${first}`
  return `Goedenavond, ${first}`
}

function formatFullDate() {
  return new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function trendLabel(current: number, previous: number) {
  if (previous === 0) return current > 0 ? '+100%' : null
  const pct = ((current - previous) / previous) * 100
  if (Math.abs(pct) < 1) return null
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [voorraad, setVoorraad] = useState<Voorraad[]>([])
  const [kanalen, setKanalen] = useState<string[]>([])

  useEffect(() => {
    getOrders().then(setOrders)
    getSyncLogs().then(setSyncLogs)
    getVoorraad().then(setVoorraad)
    getAllKanaalConfigs().then(rows => setKanalen(rows.map(r => r.kanaal)))
  }, [])

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

  const todayOrders = orders.filter(o => o.aangemaaktOp.startsWith(today))
  const yesterdayOrders = orders.filter(o => o.aangemaaktOp.startsWith(yesterdayStr))

  const activeOrders = (list: Order[]) => list.filter(o => !['cancelled', 'failed'].includes(o.status))
  const revenue = (list: Order[]) => activeOrders(list).reduce((s, o) => s + o.totaal, 0)

  const thisMonthOrders = orders.filter(o => new Date(o.aangemaaktOp) >= thisMonthStart)
  const lastMonthOrders = orders.filter(o => {
    const d = new Date(o.aangemaaktOp)
    return d >= lastMonthStart && d < lastMonthEnd
  })

  const thisMonthRevenue = revenue(thisMonthOrders)
  const lastMonthRevenue = revenue(lastMonthOrders)
  const todayRevenue = revenue(todayOrders)
  const yesterdayRevenue = revenue(yesterdayOrders)

  const pendingOrders = orders.filter(o => ['new', 'processing', 'ready_to_ship'].includes(o.status))
  const actionItems = orders.filter(o => ['new', 'failed', 'ready_to_ship'].includes(o.status))

  const recentOrders = useMemo(() =>
    [...orders]
      .sort((a, b) => new Date(b.aangemaaktOp).getTime() - new Date(a.aangemaaktOp).getTime())
      .slice(0, 5),
    [orders]
  )

  // 7-day chart
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('nl-NL', { weekday: 'short' })
      const count = orders.filter(o => o.aangemaaktOp.startsWith(key)).length
      return { key, label, count }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])
  const maxDay = Math.max(...last7Days.map(d => d.count), 1)

  // Omzet per kanaal (deze maand)
  const kanaalStats = useMemo(() => {
    return kanalen.map((kanaal, i) => {
      const ch = thisMonthOrders.filter(o => o.kanaal === kanaal)
      const rev = revenue(ch)
      return { kanaal, rev, color: CHART_COLORS[i % CHART_COLORS.length] }
    }).filter(k => k.rev > 0).sort((a, b) => b.rev - a.rev)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanalen, thisMonthOrders])
  const maxKanaalRev = Math.max(...kanaalStats.map(k => k.rev), 1)

  // Lage voorraad
  const laagVoorraad = voorraad
    .filter(v => v.beschikbaar <= v.minimumDrempel)
    .sort((a, b) => a.beschikbaar - b.beschikbaar)
    .slice(0, 5)

  // Kanaalstatus
  const channelStatus = kanalen.map(kanaal => {
    const logs = syncLogs.filter(l => l.kanaal === kanaal)
      .sort((a, b) => new Date(b.uitgevoerdOp).getTime() - new Date(a.uitgevoerdOp).getTime())
    const latest = logs[0]
    const hasError = logs.some(l => l.status === 'error')
    const hasWarning = logs.some(l => l.status === 'warning')
    const overallStatus: SyncStatus = hasError ? 'error' : hasWarning ? 'warning' : 'success'
    return { kanaal, latest, overallStatus }
  })

  const todayTrend = trendLabel(todayOrders.length, yesterdayOrders.length)
  const revenueTrend = trendLabel(thisMonthRevenue, lastMonthRevenue)
  const todayRevTrend = trendLabel(todayRevenue, yesterdayRevenue)

  return (
    <div className="py-7 px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#111827]">
          {user ? getGreeting(user.name) : 'Dashboard'}
        </h1>
        <p className="text-base text-[#9CA3AF] mt-0.5 capitalize">{formatFullDate()}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-medium text-[#6B7280]">Orders vandaag</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingCart size={13} className="text-blue-600" />
            </div>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{todayOrders.length}</p>
          <p className="text-[12px] text-[#6B7280]">
            {todayTrend ? (
              <span className={todayOrders.length >= yesterdayOrders.length ? 'text-[#16A34A]' : 'text-[#EF4444]'}>
                {todayTrend}
              </span>
            ) : null}
            {todayTrend ? ' vs gisteren' : `${yesterdayOrders.length} gisteren`}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-medium text-[#6B7280]">Omzet deze maand</span>
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp size={13} className="text-green-600" />
            </div>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">
            €{thisMonthRevenue.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[12px] text-[#6B7280]">
            {revenueTrend ? (
              <span className={thisMonthRevenue >= lastMonthRevenue ? 'text-[#16A34A]' : 'text-[#EF4444]'}>
                {revenueTrend}
              </span>
            ) : null}
            {revenueTrend ? ' vs vorige maand' : `€${lastMonthRevenue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} vorige maand`}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-medium text-[#6B7280]">Te verwerken</span>
            <div className="w-7 h-7 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock size={13} className="text-yellow-600" />
            </div>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{pendingOrders.length}</p>
          <p className="text-[12px] text-[#6B7280]">Nieuw · verwerking · klaar</p>
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

      {/* Grafiek + kanaalstatus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
        {/* 7-day bar chart */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Orders afgelopen 7 dagen</h2>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-end gap-2 h-28">
              {last7Days.map(({ key, label, count }) => (
                <div key={key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[11px] text-[#9CA3AF]">{count > 0 ? count : ''}</span>
                  <div className="w-full flex items-end" style={{ height: '72px' }}>
                    <div
                      className="w-full rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max((count / maxDay) * 72, count > 0 ? 4 : 2)}px`,
                        backgroundColor: key === today ? '#E8A000' : '#0c2332',
                        opacity: key === today ? 1 : 0.7,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-[#9CA3AF] capitalize">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Omzet per kanaal deze maand */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Omzet per kanaal — deze maand</h2>
          </div>
          <div className="px-4 py-4">
            {kanaalStats.length === 0 ? (
              <p className="text-[15px] text-[#9CA3AF] text-center py-6">Geen data</p>
            ) : kanaalStats.map(({ kanaal, rev, color }) => (
              <div key={kanaal} className="flex items-center gap-2.5 mb-3 last:mb-0">
                <span className="text-[12.5px] font-medium text-[#374151] w-28 flex-shrink-0 truncate">{kanaal}</span>
                <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(rev / maxKanaalRev) * 100}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-[12.5px] font-medium text-[#374151] min-w-[72px] text-right">
                  €{rev.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recente orders */}
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
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden sm:table-cell">Kanaal</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Klant</th>
                <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Bedrag</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden md:table-cell">Datum</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[15px] text-[#9CA3AF]">Laden…</td></tr>
              ) : recentOrders.map(order => (
                <tr
                  key={order.id}
                  className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/orders/${order.id}`}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-[#111827] text-[15.5px] font-mono">{order.kanaalOrderId || '—'}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${channelStyle(order.kanaal)}`}>
                      {order.kanaal}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-[15.5px] text-[#374151]">{order.klantNaam}</p>
                    <p className="text-[12px] text-[#9CA3AF]">{order.klantStad}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[15.5px] font-medium text-[#111827]">
                    €{order.totaal.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${STATUS_STYLE[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[15.5px] text-[#9CA3AF] hidden md:table-cell whitespace-nowrap">
                    {formatDate(order.aangemaaktOp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actiecentrum + lage voorraad + kanaalstatus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
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
            <ul>
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
                    <div className="min-w-0">
                      <p className="text-[15.5px] font-medium text-[#111827] font-mono truncate">{order.kanaalOrderId || order.id}</p>
                      <p className="text-[12.5px] text-[#9CA3AF] truncate">{order.klantNaam} — {STATUS_LABEL[order.status]}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lage voorraad */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Lage voorraad</h2>
          </div>
          {laagVoorraad.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Package size={24} className="text-green-400 mx-auto mb-2" />
              <p className="text-[15.5px] text-[#9CA3AF]">Alle voorraad op peil</p>
            </div>
          ) : (
            <ul>
              {laagVoorraad.map(v => (
                <li key={v.sku} className="border-b border-[#F3F4F6] last:border-0">
                  <Link
                    href="/producten"
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[15.5px] font-mono font-medium text-[#111827] truncate">{v.sku}</p>
                      <p className="text-[12px] text-[#9CA3AF]">Min. drempel: {v.minimumDrempel}</p>
                    </div>
                    <span className={`text-[12.5px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ml-2 ${
                      v.beschikbaar === 0 ? 'bg-red-50 text-[#EF4444]' : 'bg-yellow-50 text-[#D97706]'
                    }`}>
                      {v.beschikbaar} stuks
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Kanaalstatus */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Kanaalstatus</h2>
          </div>
          {channelStatus.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[15.5px] text-[#9CA3AF]">Geen kanalen geconfigureerd</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {channelStatus.map(({ kanaal, latest, overallStatus }) => (
                <div key={kanaal} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SyncStatusIcon status={overallStatus} />
                    <div className="min-w-0">
                      <p className="text-[15.5px] font-medium text-[#111827] truncate">{kanaal}</p>
                      {latest && (
                        <p className="text-[12px] text-[#9CA3AF] truncate">{latest.bericht.slice(0, 40)}{latest.bericht.length > 40 ? '…' : ''}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[12px] font-medium px-2 py-0.5 rounded flex-shrink-0 ml-2 ${SYNC_STYLE[overallStatus]}`}>
                    {SYNC_LABEL[overallStatus]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
