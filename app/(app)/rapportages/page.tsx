'use client'

import { useState, useEffect, useMemo } from 'react'
import { getOrders } from '@/lib/db/orders'
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/styles'
import { TrendingUp, ShoppingCart, Package, RotateCcw, Download } from 'lucide-react'
import type { Order, OrderStatus } from '@/lib/types'

const DATE_OPTIONS = [
  { value: '', label: 'Alle tijd' },
  { value: 'today', label: 'Vandaag' },
  { value: 'yesterday', label: 'Gisteren' },
  { value: '7days', label: 'Afgelopen 7 dagen' },
  { value: 'month', label: 'Deze maand' },
  { value: 'prev_month', label: 'Vorige maand' },
]

const CHART_COLORS = ['#7C3AED', '#2563EB', '#D97706', '#059669', '#DC2626', '#0891B2', '#9333EA', '#EA580C']

function isInDateRange(iso: string, range: string): boolean {
  if (!range) return true
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'today') return d >= today
  if (range === 'yesterday') {
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    return d >= yesterday && d < today
  }
  if (range === '7days') {
    const week = new Date(today); week.setDate(week.getDate() - 7); return d >= week
  }
  if (range === 'month') return d >= new Date(now.getFullYear(), now.getMonth(), 1)
  if (range === 'prev_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return d >= start && d < end
  }
  return true
}

export default function RapportagesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => { getOrders().then(setOrders) }, [])

  const filtered = useMemo(
    () => orders.filter(o => isInDateRange(o.aangemaaktOp, dateFilter)),
    [orders, dateFilter]
  )

  const activeOrders = filtered.filter(o => !['cancelled', 'failed'].includes(o.status))
  const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totaal, 0)
  const completedOrders = filtered.filter(o => o.status === 'completed')
  const returnedOrders = filtered.filter(o => o.status === 'returned')
  const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0

  // Dynamic channel stats from actual order data
  const channelNames = [...new Set(filtered.map(o => o.kanaal))].sort()
  const channelStats = channelNames.map((kanaal, i) => {
    const ch = filtered.filter(o => o.kanaal === kanaal)
    const revenue = ch
      .filter(o => !['cancelled', 'failed'].includes(o.status))
      .reduce((sum, o) => sum + o.totaal, 0)
    return { kanaal, count: ch.length, revenue, color: CHART_COLORS[i % CHART_COLORS.length] }
  }).sort((a, b) => b.revenue - a.revenue)
  const maxRevenue = Math.max(...channelStats.map(s => s.revenue), 1)

  // Top products from active orders
  const productMap = new Map<string, { naam: string; stuks: number; omzet: number }>()
  filtered
    .filter(o => !['cancelled', 'failed'].includes(o.status))
    .forEach(o => o.regels.forEach(r => {
      const p = productMap.get(r.sku)
      if (p) { p.stuks += r.aantal; p.omzet += r.prijs * r.aantal }
      else productMap.set(r.sku, { naam: r.naam, stuks: r.aantal, omzet: r.prijs * r.aantal })
    }))
  const topProducts = [...productMap.entries()]
    .map(([sku, v]) => ({ sku, ...v }))
    .sort((a, b) => b.omzet - a.omzet)
    .slice(0, 6)

  // Status breakdown
  const statusCounts = filtered.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1; return acc
  }, {} as Record<string, number>)
  const statusBreakdown = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])

  function exportCSV() {
    const header = ['Order ID', 'Kanaal', 'Klant', 'E-mail', 'Status', 'Bedrag (€)', 'Datum']
    const rows = filtered.map(o => [
      o.id, o.kanaal, o.klantNaam, o.klantEmail,
      STATUS_LABEL[o.status],
      o.totaal.toFixed(2),
      new Date(o.aangemaaktOp).toLocaleDateString('nl-NL'),
    ])
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `rapportage-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const dateLabel = DATE_OPTIONS.find(o => o.value === dateFilter)?.label ?? ''

  return (
    <div className="py-7 px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Rapportages</h1>
          <p className="text-base text-[#9CA3AF] mt-0.5">
            {filtered.length} orders{dateFilter ? ` · ${dateLabel}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-[15.5px] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
          >
            {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15.5px] font-medium border border-[#E5E7EB] rounded-md text-[#374151] bg-white hover:bg-[#F9FAFB] transition-colors"
          >
            <Download size={13} />
            Exporteren
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={13} className="text-[#22C55E]" />
            <span className="text-[12.5px] text-[#6B7280]">Totale omzet</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">
            €{totalRevenue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[12px] text-[#6B7280]">{activeOrders.length} actieve orders</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={13} className="text-[#3B82F6]" />
            <span className="text-[12.5px] text-[#6B7280]">Totaal orders</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{filtered.length}</p>
          <p className="text-[12px] text-[#6B7280]">{completedOrders.length} afgerond</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={13} className="text-[#E8A000]" />
            <span className="text-[12.5px] text-[#6B7280]">Gem. orderbedrag</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">
            €{avgOrderValue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[12px] text-[#6B7280]">Per actieve order</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw size={13} className="text-[#EA580C]" />
            <span className="text-[12.5px] text-[#6B7280]">Retouren</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{returnedOrders.length}</p>
          <p className="text-[12px] text-[#6B7280]">
            {filtered.length > 0 ? ((returnedOrders.length / filtered.length) * 100).toFixed(1) : '0'}% retourpercentage
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
        {/* Omzet per kanaal */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Omzet per kanaal</h2>
          </div>
          <div className="px-4 py-4">
            {channelStats.length === 0 ? (
              <p className="text-[15px] text-[#9CA3AF] text-center py-6">Geen data</p>
            ) : channelStats.map(({ kanaal, count, revenue, color }) => (
              <div key={kanaal} className="flex items-center gap-2.5 mb-3 last:mb-0">
                <span className="text-[12.5px] font-medium text-[#374151] w-28 flex-shrink-0 truncate">{kanaal}</span>
                <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(revenue / maxRevenue) * 100}%`, backgroundColor: color }}
                  />
                </div>
                <div className="text-right min-w-[100px]">
                  <span className="text-[12.5px] font-medium text-[#374151]">
                    €{revenue.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[12px] text-[#9CA3AF] ml-1.5">{count} ord.</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top producten */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Top producten</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {topProducts.length === 0 ? (
              <p className="text-[15px] text-[#9CA3AF] text-center py-8">Geen data</p>
            ) : topProducts.map(p => (
              <div key={p.sku} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[15.5px] font-medium text-[#111827]">{p.naam}</p>
                  <p className="text-[12px] text-[#9CA3AF] font-mono">{p.sku} · {p.stuks} stuks</p>
                </div>
                <span className="text-[15.5px] font-semibold text-[#111827]">
                  €{p.omzet.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders per status */}
      <div className="bg-white rounded-lg border border-[#E5E7EB]">
        <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
          <h2 className="text-[16px] font-semibold text-[#111827]">Orders per status</h2>
        </div>
        {statusBreakdown.length === 0 ? (
          <p className="text-[15px] text-[#9CA3AF] text-center py-8">Geen data</p>
        ) : (
          <div className="flex flex-wrap">
            {statusBreakdown.map(([status, count]) => (
              <div key={status} className="flex-1 min-w-[120px] px-4 py-4 border-r border-b border-[#F3F4F6] last:border-r-0 text-center">
                <p className="text-[24px] font-semibold text-[#111827] leading-none mb-2">{count}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${STATUS_STYLE[status as OrderStatus]}`}>
                  {STATUS_LABEL[status as OrderStatus] ?? status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
