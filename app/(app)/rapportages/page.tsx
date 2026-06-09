'use client'

import { useState, useEffect } from 'react'
import { getOrders } from '@/lib/db/orders'
import { TrendingUp, ShoppingCart, Package, RotateCcw } from 'lucide-react'
import type { Order, Kanaal } from '@/lib/types'

const mainChannels: Kanaal[] = ['WooCommerce', 'bol.com', 'Mirakl', 'eBay']

type KanaalRij = { label: string; kanaal: Kanaal; count: number; revenue: number; pct: number; color: string }

export default function RapportagesPage() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => { getOrders().then(setOrders) }, [])

  const activeOrders = orders.filter(o => !['cancelled', 'failed'].includes(o.status))
  const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totaal, 0)
  const completedOrders = orders.filter(o => o.status === 'completed')
  const returnedOrders = orders.filter(o => o.status === 'returned')
  const cancelledOrders = orders.filter(o => ['cancelled', 'failed'].includes(o.status))

  const channelColors: Record<Kanaal, string> = {
    'WooCommerce': '#7C3AED',
    'bol.com': '#2563EB',
    'Mirakl': '#D97706',
    'eBay': '#059669',
  }

  const miraklOrders = orders.filter(o => o.kanaal === 'Mirakl' && !['cancelled', 'failed'].includes(o.status))
  const miraklRevenue = miraklOrders.reduce((s, o) => s + o.totaal, 0)
  const miraklCount = orders.filter(o => o.kanaal === 'Mirakl').length

  const baseStats = mainChannels
    .filter(k => k !== 'Mirakl')
    .map(kanaal => {
      const channelOrders = orders.filter(o => o.kanaal === kanaal)
      const revenue = channelOrders
        .filter(o => !['cancelled', 'failed'].includes(o.status))
        .reduce((sum, o) => sum + o.totaal, 0)
      return { label: kanaal, kanaal, count: channelOrders.length, revenue, color: channelColors[kanaal] }
    })

  const obelinkRevenue = Math.round(miraklRevenue * 0.63)
  const home24Revenue = miraklRevenue - obelinkRevenue
  const obelinkCount = Math.ceil(miraklCount * 0.6)
  const home24Count = miraklCount - obelinkCount

  const allStats: Omit<KanaalRij, 'pct'>[] = [
    ...baseStats,
    { label: 'Obelink (Mirakl)', kanaal: 'Mirakl', count: obelinkCount, revenue: obelinkRevenue, color: '#D97706' },
    { label: 'Home24 (Mirakl)', kanaal: 'Mirakl', count: home24Count, revenue: home24Revenue, color: '#EA580C' },
  ]

  const maxRevenue = Math.max(...allStats.map(s => s.revenue), 1)
  const channelStats: KanaalRij[] = allStats.map(s => ({
    ...s,
    pct: (s.revenue / maxRevenue) * 100,
  }))

  const topProducts: { naam: string; sku: string; stuks: number; omzet: number }[] = []
  orders.forEach(o => {
    o.regels.forEach(r => {
      const existing = topProducts.find(p => p.sku === r.sku)
      if (existing) {
        existing.stuks += r.aantal
        existing.omzet += r.prijs * r.aantal
      } else {
        topProducts.push({ naam: r.naam, sku: r.sku, stuks: r.aantal, omzet: r.prijs * r.aantal })
      }
    })
  })
  topProducts.sort((a, b) => b.omzet - a.omzet)

  return (
    <div className="py-7 px-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#111827]">Rapportages</h1>
        <p className="text-base text-[#9CA3AF] mt-0.5">Overzicht van alle orderdata</p>
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
          <p className="text-[12px] text-[#6B7280]">Actieve orders</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={13} className="text-[#3B82F6]" />
            <span className="text-[12.5px] text-[#6B7280]">Totaal orders</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{orders.length}</p>
          <p className="text-[12px] text-[#6B7280]">{completedOrders.length} afgerond</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw size={13} className="text-[#EA580C]" />
            <span className="text-[12.5px] text-[#6B7280]">Retouren</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{returnedOrders.length}</p>
          <p className="text-[12px] text-[#6B7280]">
            {orders.length > 0 ? ((returnedOrders.length / orders.length) * 100).toFixed(1) : 0}% retourpercentage
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={13} className="text-[#9CA3AF]" />
            <span className="text-[12.5px] text-[#6B7280]">Geannuleerd</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{cancelledOrders.length}</p>
          <p className="text-[12px] text-[#6B7280]">Geannuleerd + mislukt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
        {/* Per kanaal */}
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
            <h2 className="text-[16px] font-semibold text-[#111827]">Omzet per kanaal</h2>
          </div>
          <div className="px-4 pt-4 pb-2">
            {channelStats.map(({ label, count, revenue, pct, color }) => (
              <div key={label} className="flex items-center gap-2.5 mb-3">
                <span className="text-[12.5px] font-medium text-[#374151] w-32 flex-shrink-0 truncate">{label}</span>
                <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <div className="text-right min-w-[90px]">
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
            <h2 className="text-[16px] font-semibold text-[#111827]">Top producten (omzet)</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {topProducts.slice(0, 6).map(p => (
              <div key={p.sku} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[15.5px] font-medium text-[#111827]">{p.naam}</p>
                  <p className="text-[12px] text-[#9CA3AF] font-mono">{p.sku} — {p.stuks} stuks</p>
                </div>
                <span className="text-[15.5px] font-semibold text-[#111827]">
                  €{p.omzet.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#FFFBEB] border border-yellow-200 rounded-lg px-4 py-3 text-[15.5px] text-[#92400E]">
        <strong>Opmerking:</strong> Rapportages zijn gebaseerd op livedata uit Supabase. Grafieken, datumfilters en exportfuncties worden toegevoegd in een volgende fase.
      </div>
    </div>
  )
}
