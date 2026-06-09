'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getOrders } from '@/lib/db/orders'
import { bulkUpdateStatus, bulkMarkAfas } from '@/lib/actions/orders'
import { getAllKanaalConfigs } from '@/lib/actions/kanaal-config'
import { supabase } from '@/lib/supabase/client'
import { STATUS_LABEL, STATUS_STYLE, CHANNEL_STYLE, channelStyle } from '@/lib/styles'
import { Search, ChevronDown, CheckSquare } from 'lucide-react'
import type { Order, OrderStatus, Kanaal, AfasStatus } from '@/lib/types/index'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')
}

const ALL_STATUSES: OrderStatus[] = ['new', 'processing', 'ready_to_ship', 'shipped', 'completed', 'cancelled', 'returned', 'failed']
const PAGE_SIZES = [20, 50, 100]

const DATE_FILTER_OPTIONS = [
  { value: '', label: 'Alle datums' },
  { value: 'today', label: 'Vandaag' },
  { value: 'yesterday', label: 'Gisteren' },
  { value: '7days', label: 'Afgelopen 7 dagen' },
  { value: 'month', label: 'Deze maand' },
]

function isInDateRange(iso: string, range: string): boolean {
  if (!range) return true
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'today') return d >= today
  if (range === 'yesterday') {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return d >= yesterday && d < today
  }
  if (range === '7days') {
    const week = new Date(today)
    week.setDate(week.getDate() - 7)
    return d >= week
  }
  if (range === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return d >= monthStart
  }
  return true
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [channelFilter, setChannelFilter] = useState<Kanaal | ''>('')
  const [afasFilter, setAfasFilter] = useState<AfasStatus | ''>('')
  const [dateFilter, setDateFilter] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [kanalen, setKanalen] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkWorking, setBulkWorking] = useState(false)
  const bulkRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAllKanaalConfigs().then(rows => setKanalen(rows.map(r => r.kanaal)))
    getOrders().then(setOrders)
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        getOrders().then(setOrders)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  function exportCSV() {
    const header = ['ID', 'Kanaal', 'Klant', 'Status', 'AFAS', 'Totaal', 'Datum']
    const rows = filtered.map(o => [
      o.id,
      o.kanaal,
      o.klantNaam,
      STATUS_LABEL[o.status],
      o.afasStatus === 'entered' ? 'Ingevoerd' : 'Niet ingevoerd',
      `€${o.totaal.toFixed(2)}`,
      new Date(o.aangemaaktOp).toLocaleDateString('nl-NL'),
    ])
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = useMemo(() => orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q || o.id.toLowerCase().includes(q) || o.klantNaam.toLowerCase().includes(q) || o.kanaalOrderId.toLowerCase().includes(q)
    const matchStatus = !statusFilter || o.status === statusFilter
    const matchChannel = !channelFilter || o.kanaal === channelFilter
    const matchAfas = !afasFilter || o.afasStatus === afasFilter
    const matchDate = isInDateRange(o.aangemaaktOp, dateFilter)
    return matchSearch && matchStatus && matchChannel && matchAfas && matchDate
  }).sort((a, b) => new Date(b.aangemaaktOp).getTime() - new Date(a.aangemaaktOp).getTime()), [orders, search, statusFilter, channelFilter, afasFilter, dateFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageEnd = Math.min(pageStart + pageSize, filtered.length)
  const paginated = filtered.slice(pageStart, pageEnd)

  const allOnPageSelected = paginated.length > 0 && paginated.every(o => selected.has(o.id))

  function toggleAll() {
    if (allOnPageSelected) {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(o => s.delete(o.id)); return s })
    } else {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(o => s.add(o.id)); return s })
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function resetPage() { setPage(1) }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) {
        setBulkOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleBulkStatus(status: OrderStatus) {
    setBulkOpen(false)
    setBulkWorking(true)
    await bulkUpdateStatus(Array.from(selected), status)
    setSelected(new Set())
    setBulkWorking(false)
    getOrders().then(setOrders)
  }

  async function handleBulkAfas() {
    setBulkOpen(false)
    setBulkWorking(true)
    await bulkMarkAfas(Array.from(selected))
    setSelected(new Set())
    setBulkWorking(false)
    getOrders().then(setOrders)
  }

  return (
    <div className="py-7 px-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Orders</h1>
          <p className="text-base text-[#9CA3AF] mt-0.5">{filtered.length} van {orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center px-3 py-1.5 text-[15.5px] font-medium border border-[#E5E7EB] rounded-md text-[#374151] bg-white hover:bg-[#F9FAFB] transition-colors"
          >
            Exporteren
          </button>
          {selected.size > 0 && (
            <div ref={bulkRef} className="relative">
              <button
                onClick={() => setBulkOpen(o => !o)}
                disabled={bulkWorking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15.5px] font-medium bg-[#0E2A3C] text-white rounded-md hover:bg-[#1a3f5c] disabled:opacity-60 transition-colors"
              >
                {bulkWorking ? 'Bezig…' : `Bulkactie (${selected.size})`}
                <ChevronDown size={13} />
              </button>
              {bulkOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 py-1">
                  <p className="px-3 py-1.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Status wijzigen</p>
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => handleBulkStatus(s)}
                      className="w-full text-left px-3 py-1.5 text-[14px] text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
                    >
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[s]}`}>
                        {STATUS_LABEL[s]}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-[#F3F4F6] mt-1 pt-1">
                    <p className="px-3 py-1.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">AFAS</p>
                    <button
                      onClick={handleBulkAfas}
                      className="w-full text-left px-3 py-1.5 text-[14px] text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
                    >
                      <CheckSquare size={13} className="text-[#16A34A]" />
                      Markeren als ingevoerd
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage() }}
            placeholder="Zoek op order, klant, e-mail…"
            className="pl-8 pr-3 py-1.5 text-[15.5px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors w-[220px]"
          />
        </div>
        <select
          value={channelFilter}
          onChange={e => { setChannelFilter(e.target.value as Kanaal | ''); resetPage() }}
          className="text-[15.5px] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
        >
          <option value="">Alle kanalen</option>
          {kanalen.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as OrderStatus | ''); resetPage() }}
          className="text-[15.5px] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
        >
          <option value="">Alle statussen</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select
          value={afasFilter}
          onChange={e => { setAfasFilter(e.target.value as AfasStatus | ''); resetPage() }}
          className="text-[15.5px] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
        >
          <option value="">AFAS — alle</option>
          <option value="not_entered">Niet ingevoerd</option>
          <option value="entered">Ingevoerd</option>
        </select>
        <select
          value={dateFilter}
          onChange={e => { setDateFilter(e.target.value); resetPage() }}
          className="text-[15.5px] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
        >
          {DATE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="px-4 py-2.5 w-8">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="cursor-pointer accent-[#E8A000]" />
                </th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide whitespace-nowrap">Order ID</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden sm:table-cell">Kanaal</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Klant</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden md:table-cell">Producten</th>
                <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Bedrag</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden lg:table-cell">AFAS</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden lg:table-cell">Vervoerder</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden md:table-cell">Datum</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-[15.5px] text-[#9CA3AF]">Laden…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-[15.5px] text-[#9CA3AF]">Geen orders gevonden</td></tr>
              ) : (
                paginated.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5" onClick={e => { e.stopPropagation(); toggleOne(order.id) }}>
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        onClick={e => e.stopPropagation()}
                        className="cursor-pointer accent-[#E8A000]"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-[#111827] text-[15.5px] font-mono">{order.id}</span>
                      <p className="text-[12px] text-[#9CA3AF] mt-0.5">{order.kanaalOrderId}</p>
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
                    <td className="px-4 py-2.5 text-[15.5px] text-[#6B7280] hidden md:table-cell">
                      {order.regels.reduce((s, r) => s + r.aantal, 0)} artikel{order.regels.reduce((s, r) => s + r.aantal, 0) !== 1 ? 'en' : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[15.5px] font-medium text-[#111827]">
                      €{order.totaal.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${STATUS_STYLE[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
                        order.afasStatus === 'entered' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F9FAFB] text-[#9CA3AF]'
                      }`}>
                        {order.afasStatus === 'entered' ? 'Ingevoerd' : 'Niet ingevoerd'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[15.5px] hidden lg:table-cell">
                      {order.vervoerder ? <span className="text-[#374151]">{order.vervoerder}</span> : <span className="text-[#9CA3AF]">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[15.5px] text-[#9CA3AF] hidden md:table-cell whitespace-nowrap">
                      {formatDateTime(order.aangemaaktOp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-2 text-[15px] text-[#9CA3AF]">
            <span>Toon</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="text-[15px] border border-[#E5E7EB] rounded px-1.5 py-0.5 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>per pagina</span>
            {filtered.length > 0 && (
              <span className="ml-2">· {pageStart + 1}–{pageEnd} van {filtered.length} orders</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-[15px] border border-[#E5E7EB] rounded text-[#374151] bg-white hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Vorige
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-[15px] border border-[#E5E7EB] rounded text-[#374151] bg-white hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Volgende →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
