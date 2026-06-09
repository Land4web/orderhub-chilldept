'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getOrders } from '@/lib/db/orders'
import { useAuth } from '@/contexts/AuthContext'
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/styles'
import { Search, Truck, Package } from 'lucide-react'
import type { Order, OrderStatus } from '@/lib/types'

const relevantStatuses: OrderStatus[] = ['new', 'processing', 'ready_to_ship', 'shipped', 'returned']

export default function FulfillmentPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')

  useEffect(() => { getOrders().then(setOrders) }, [])

  const filtered = orders
    .filter(o => relevantStatuses.includes(o.status))
    .filter(o => {
      const q = search.toLowerCase()
      const matchSearch = !q || o.id.toLowerCase().includes(q) || o.klantNaam.toLowerCase().includes(q)
      const matchStatus = !statusFilter || o.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => new Date(b.aangemaaktOp).getTime() - new Date(a.aangemaaktOp).getTime())

  const countNieuw = orders.filter(o => o.status === 'new').length
  const countInBehandeling = orders.filter(o => o.status === 'processing').length
  const countKlaar = orders.filter(o => o.status === 'ready_to_ship').length

  return (
    <div className="py-7 px-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#111827]">Te verwerken orders</h1>
        <p className="text-base text-[#9CA3AF] mt-0.5">
          Welkom, {user?.name} — orders om te verwerken en verzenden
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Package size={13} className="text-[#3B82F6]" />
            <span className="text-[12.5px] text-[#6B7280]">Nieuw</span>
          </div>
          <p className="text-[26px] font-semibold text-[#3B82F6] leading-none mb-1">{countNieuw}</p>
          <p className="text-[12px] text-[#9CA3AF]">Nog niet opgepakt</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Package size={13} className="text-[#F59E0B]" />
            <span className="text-[12.5px] text-[#6B7280]">In behandeling</span>
          </div>
          <p className="text-[26px] font-semibold text-[#F59E0B] leading-none mb-1">{countInBehandeling}</p>
          <p className="text-[12px] text-[#9CA3AF]">Wordt verwerkt</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Truck size={13} className="text-[#22C55E]" />
            <span className="text-[12.5px] text-[#6B7280]">Klaar voor verzending</span>
          </div>
          <p className="text-[26px] font-semibold text-[#22C55E] leading-none mb-1">{countKlaar}</p>
          <p className="text-[12px] text-[#9CA3AF]">T&T nog in te vullen</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek op order of klant..."
            className="w-full pl-8 pr-3 py-1.5 text-[15.5px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as OrderStatus | '')}
          className="text-[15.5px] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
        >
          <option value="">Alle statussen</option>
          {relevantStatuses.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Klant</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden md:table-cell">Afleveradres</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden md:table-cell">Track & trace</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden sm:table-cell">Producten</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-[15.5px] text-[#9CA3AF]">Laden…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-[15.5px] text-[#9CA3AF]">Geen orders gevonden</td></tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/orders/${order.id}`} className="font-medium text-[#111827] hover:text-[#E8A000] transition-colors text-[15.5px]">
                        {order.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-[15.5px] font-medium text-[#374151]">{order.klantNaam}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <p className="text-[15px] text-[#6B7280] leading-relaxed">
                        {order.klantAdres}<br />
                        {order.klantPostcode} {order.klantStad}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${STATUS_STYLE[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {order.trackingCode ? (
                        <span className="text-[12.5px] font-mono text-[#6B7280]">{order.trackingCode}</span>
                      ) : (
                        <span className="text-[15.5px] text-[#D1D5DB]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] text-[#6B7280] hidden sm:table-cell">
                      {order.regels.map(r => `${r.aantal}× ${r.naam}`).join(', ').slice(0, 50)}
                      {order.regels.map(r => `${r.aantal}× ${r.naam}`).join(', ').length > 50 ? '…' : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
