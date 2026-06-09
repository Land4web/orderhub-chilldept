'use client'

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getOrderById } from '@/lib/db/orders'
import { updateOrderStatus, saveNote, toggleAfasStatus, saveTrackingCode, deleteOrder } from '@/lib/actions/orders'
import { STATUS_LABEL, STATUS_STYLE, channelStyle } from '@/lib/styles'
import { Check, ChevronDown, Download, Trash2, X } from 'lucide-react'
import type { Order, OrderStatus, AfasStatus } from '@/lib/types'

function formatDateShort(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return `Vandaag ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const ALL_STATUSES: OrderStatus[] = ['new', 'processing', 'ready_to_ship', 'shipped', 'completed', 'cancelled', 'returned']

function buildTimeline(status: OrderStatus, afasStatus: AfasStatus, order: Order) {
  const events: { title: string; meta: string; timestamp: string | null; active: boolean; green: boolean }[] = []
  const statusOrder: OrderStatus[] = ['new', 'processing', 'ready_to_ship', 'shipped', 'completed']
  const idx = statusOrder.indexOf(status)

  if (status === 'cancelled') {
    events.push({ title: 'Geannuleerd', meta: 'Handmatig geannuleerd', timestamp: order.bijgewerktOp, active: true, green: false })
  } else if (status === 'returned') {
    events.push({ title: 'Retour ontvangen', meta: 'Retour verwerkt', timestamp: order.bijgewerktOp, active: true, green: false })
  } else if (idx >= 0) {
    const labels: Partial<Record<OrderStatus, string>> = {
      completed: 'Afgerond', shipped: 'Verzonden',
      ready_to_ship: 'Klaar voor verzending', processing: 'In verwerking',
    }
    for (let i = idx; i > 0; i--) {
      const s = statusOrder[i]
      events.push({
        title: labels[s] ?? STATUS_LABEL[s],
        meta: 'Statuswijziging',
        timestamp: i === idx ? order.bijgewerktOp : null,
        active: i === idx,
        green: i < idx,
      })
    }
  }

  if (afasStatus === 'entered') {
    events.push({ title: 'AFAS ingevoerd', meta: 'Handmatig ingevoerd', timestamp: order.afasIngevoerdOp ?? null, active: false, green: true })
  }

  events.push({
    title: 'Order ontvangen',
    meta: `via ${order.kanaal}`,
    timestamp: order.aangemaaktOp,
    active: false,
    green: false,
  })

  return events
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loadError, setLoadError] = useState(false)

  const [status, setStatus] = useState<OrderStatus>('new')
  const [afasStatus, setAfasStatus] = useState<AfasStatus>('not_entered')
  const [afasIngevoerdOp, setAfasIngevoerdOp] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [trackingInput, setTrackingInput] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [undoAction, setUndoAction] = useState<{ label: string; revert: () => Promise<void> } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getOrderById(id).then(o => {
      if (!o) { setLoadError(true); return }
      setOrder(o)
      setStatus(o.status)
      setAfasStatus(o.afasStatus)
      setAfasIngevoerdOp(o.afasIngevoerdOp ?? null)
      setNote(o.notities)
      setTrackingCode(o.trackingCode)
      setTrackingInput(o.trackingCode ?? '')
    })
  }, [id])

  if (loadError) notFound()
  if (!order) {
    return (
      <div className="py-7 px-8 max-w-5xl mx-auto">
        <div className="text-[15px] text-[#9CA3AF]">Laden…</div>
      </div>
    )
  }

  const timeline = buildTimeline(status, afasStatus, order)

  function showUndo(label: string, revert: () => Promise<void>) {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoAction({ label, revert })
    undoTimer.current = setTimeout(() => setUndoAction(null), 6000)
  }

  function dismissUndo() {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoAction(null)
  }

  async function handleStatusChange(newStatus: OrderStatus) {
    const prev = status
    setStatus(newStatus)
    await updateOrderStatus(id, newStatus)
    showUndo(`Status gewijzigd naar "${STATUS_LABEL[newStatus]}"`, async () => {
      setStatus(prev)
      await updateOrderStatus(id, prev)
    })
  }

  async function handleToggleAfas() {
    const newAfas: AfasStatus = afasStatus === 'entered' ? 'not_entered' : 'entered'
    const prevAfas = afasStatus
    const prevAfasOp = afasIngevoerdOp
    setAfasStatus(newAfas)
    if (newAfas === 'entered') setAfasIngevoerdOp(new Date().toISOString())
    else setAfasIngevoerdOp(null)
    await toggleAfasStatus(id, newAfas)
    showUndo(newAfas === 'entered' ? 'AFAS ingevoerd' : 'AFAS verwijderd', async () => {
      setAfasStatus(prevAfas)
      setAfasIngevoerdOp(prevAfasOp)
      await toggleAfasStatus(id, prevAfas)
    })
  }

  async function handleSaveNote() {
    const val = noteInput || note || ''
    setNote(val || null)
    setAddingNote(false)
    setNoteInput('')
    await saveNote(id, val)
  }

  async function handleSaveTracking() {
    setTrackingCode(trackingInput || null)
    await saveTrackingCode(id, trackingInput)
  }

  async function handleDelete() {
    await deleteOrder(id)
    router.push('/orders')
  }

  return (
    <div className="py-7 px-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[15px] text-[#9CA3AF] mb-5">
        <Link href="/orders" className="text-[#6B7280] hover:text-[#111827] transition-colors">Orders</Link>
        <span>›</span>
        <span className="text-[#111827] font-medium">{order.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg font-semibold text-[#111827]">{order.id}</h1>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${channelStyle(order.kanaal)}`}>
            {order.kanaal}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${STATUS_STYLE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={status}
              onChange={e => handleStatusChange(e.target.value as OrderStatus)}
              className="appearance-none pl-3 pr-7 py-1.5 text-[15px] font-medium border border-[#E5E7EB] rounded-md bg-white text-[#374151] outline-none focus:border-[#E8A000] cursor-pointer"
            >
              <option value="" disabled>Wijzig status…</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={handleToggleAfas}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[15px] font-medium border transition-colors ${
              afasStatus === 'entered'
                ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
                : 'bg-[#E8A000] border-[#E8A000] text-white hover:bg-[#d49200] hover:border-[#d49200]'
            }`}
          >
            <Check size={12} strokeWidth={2.5} />
            {afasStatus === 'entered' ? 'AFAS ingevoerd' : 'AFAS invoeren'}
          </button>
          <button
            onClick={() => window.open(`/orders/${order.id}/pakbon`, '_blank')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[15px] font-medium border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#F9FAFB] transition-colors"
          >
            <Download size={12} />
            Pakbon
          </button>
          <button
            onClick={() => window.open(`/orders/${order.id}/factuur`, '_blank')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[15px] font-medium border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#F9FAFB] transition-colors"
          >
            <Download size={12} />
            Factuur
          </button>
          <button
            onClick={() => handleStatusChange('cancelled')}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-[15px] font-medium border border-[#FECACA] text-[#EF4444] bg-white hover:bg-[#FEF2F2] transition-colors"
          >
            Annuleren
          </button>
          {deleteConfirm ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md">
              <span className="text-[14px] text-[#EF4444] font-medium">Permanent verwijderen?</span>
              <button
                onClick={handleDelete}
                className="text-[14px] font-semibold text-white bg-[#EF4444] px-2 py-0.5 rounded hover:bg-[#DC2626] transition-colors"
              >
                Ja
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-[14px] text-[#6B7280] hover:text-[#374151] transition-colors"
              >
                Nee
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[15px] font-medium border border-[#E5E7EB] text-[#6B7280] bg-white hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#EF4444] transition-colors"
            >
              <Trash2 size={12} />
              Verwijderen
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-3.5">
          {/* Order lines */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB]">
              <h2 className="text-[16px] font-semibold text-[#111827]">Orderregels</h2>
              <span className="text-[15px] text-[#6B7280]">
                {order.regels.reduce((s, r) => s + r.aantal, 0)} artikelen · €{order.totaal.toFixed(2)}
              </span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">SKU</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Product</th>
                  <th className="text-center px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Aantal</th>
                  <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Stukprijs</th>
                  <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {order.regels.map((regel, i) => (
                  <tr key={i} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="px-4 py-2.5 text-[12.5px] text-[#9CA3AF] font-mono">{regel.sku}</td>
                    <td className="px-4 py-2.5 text-[15.5px] font-medium text-[#111827]">{regel.naam}</td>
                    <td className="px-4 py-2.5 text-center text-[15.5px] text-[#374151]">{regel.aantal}</td>
                    <td className="px-4 py-2.5 text-right text-[15.5px] text-[#374151]">€{regel.prijs.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-[15.5px] font-medium text-[#374151]">€{(regel.prijs * regel.aantal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-8 px-4 py-3 border-t border-[#F3F4F6]">
              <span className="text-[15px] text-[#6B7280]">Subtotaal</span>
              <span className="text-[15px] font-medium text-[#111827]">€{order.totaal.toFixed(2)}</span>
            </div>
          </div>

          {/* Verzending */}
          <div className="bg-white rounded-lg border border-[#E5E7EB]">
            <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
              <h2 className="text-[16px] font-semibold text-[#111827]">Verzending</h2>
            </div>
            <div className="px-4 py-4">
              <p className="text-[12px] text-[#9CA3AF] mb-1.5">Track & Trace code</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  placeholder="Bijv. 3SBOL123456789"
                  className="flex-1 px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
                <button
                  onClick={handleSaveTracking}
                  disabled={trackingInput === (trackingCode ?? '')}
                  className="px-3 py-1.5 text-[15px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Opslaan
                </button>
              </div>
              {trackingCode && trackingInput === trackingCode && (
                <p className="mt-1.5 text-[12px] text-[#6B7280]">
                  Opgeslagen: <span className="font-mono">{trackingCode}</span>
                </p>
              )}
            </div>
          </div>

          {/* Tijdlijn */}
          <div className="bg-white rounded-lg border border-[#E5E7EB]">
            <div className="px-4 py-3.5 border-b border-[#E5E7EB]">
              <h2 className="text-[16px] font-semibold text-[#111827]">Tijdlijn</h2>
            </div>
            <div className="px-5 py-4">
              <ul className="space-y-0">
                {timeline.map((ev, i) => (
                  <li key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                    {i < timeline.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-[#E5E7EB]" />
                    )}
                    <div className={`w-[23px] h-[23px] rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 z-10 ${
                      ev.active ? 'border-[#E8A000] bg-[#E8A000]' :
                      ev.green ? 'border-[#22C55E] bg-[#22C55E]' :
                      'border-[#6B7280] bg-white'
                    }`}>
                      {(ev.active || ev.green) && (
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" fill="none"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-[15.5px] font-medium text-[#111827]">{ev.title}</p>
                      <p className="text-[12px] text-[#9CA3AF]">
                        {ev.timestamp ? `${formatDateShort(ev.timestamp)} · ${ev.meta}` : ev.meta}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Notities */}
          <div className="bg-white rounded-lg border border-[#E5E7EB]">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB]">
              <h2 className="text-[16px] font-semibold text-[#111827]">Notities</h2>
              {!addingNote && (
                <button
                  onClick={() => setAddingNote(true)}
                  className="text-[12px] font-medium px-2.5 py-1 border border-[#E5E7EB] rounded-md text-[#374151] hover:bg-[#F9FAFB] transition-colors"
                >
                  + Toevoegen
                </button>
              )}
            </div>
            <div className="px-4 py-4 space-y-2">
              {note && (
                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-3.5 py-2.5 text-[15.5px] text-[#92400E]">
                  {note}
                </div>
              )}
              {addingNote && (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    placeholder="Voeg een notitie toe…"
                    rows={3}
                    className="w-full px-3 py-2 text-[15.5px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] resize-none text-[#374151]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNote}
                      className="px-3 py-1.5 text-[15px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] transition-colors"
                    >
                      Opslaan
                    </button>
                    <button
                      onClick={() => { setAddingNote(false); setNoteInput('') }}
                      className="px-3 py-1.5 text-[15px] font-medium border border-[#E5E7EB] rounded-md text-[#374151] hover:bg-[#F9FAFB] transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
              {!note && !addingNote && (
                <p className="text-[15px] text-[#9CA3AF]">Geen notities</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3.5">
          {/* Klantgegevens */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Klantgegevens</p>
            <div className="space-y-2.5">
              <div>
                <p className="text-[12px] text-[#9CA3AF]">Naam</p>
                <p className="text-[15.5px] font-medium text-[#111827]">{order.klantNaam}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#9CA3AF]">E-mail</p>
                <a href={`mailto:${order.klantEmail}`} className="text-[15.5px] text-[#2563EB] hover:underline">
                  {order.klantEmail}
                </a>
              </div>
              {order.klantTelefoon && (
                <div>
                  <p className="text-[12px] text-[#9CA3AF]">Telefoon</p>
                  <a href={`tel:${order.klantTelefoon}`} className="text-[15.5px] text-[#374151] hover:underline">
                    {order.klantTelefoon}
                  </a>
                </div>
              )}
              <div>
                <p className="text-[12px] text-[#9CA3AF]">Afleveradres</p>
                <div className="text-[15.5px] text-[#374151] leading-relaxed">
                  {order.klantAdres}<br />
                  {order.klantPostcode} {order.klantStad}<br />
                  {order.klantLand}
                </div>
              </div>
            </div>
          </div>

          {/* AFAS */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">AFAS</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
                afasStatus === 'entered' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F9FAFB] text-[#9CA3AF]'
              }`}>
                {afasStatus === 'entered' ? 'Ingevoerd' : 'Niet ingevoerd'}
              </span>
            </div>
            {afasStatus === 'entered' ? (
              <div className="space-y-2.5">
                <div>
                  <p className="text-[12px] text-[#9CA3AF]">Platformnummer</p>
                  <p className="text-[15.5px] font-mono text-[#374151]">{order.kanaalOrderId}</p>
                </div>
                {afasIngevoerdOp && (
                  <div>
                    <p className="text-[12px] text-[#9CA3AF]">Ingevoerd op</p>
                    <p className="text-[15.5px] text-[#374151]">{formatDateShort(afasIngevoerdOp)}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-[#9CA3AF]">
                Gebruik de &quot;AFAS invoeren&quot; knop boven om de status te wijzigen.
              </p>
            )}
          </div>

          {/* Orderinfo */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Orderinfo</p>
            <div className="space-y-2.5">
              <div>
                <p className="text-[12px] text-[#9CA3AF]">Kanaal order ID</p>
                <p className="text-[15.5px] font-mono text-[#374151]">{order.kanaalOrderId}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#9CA3AF]">Kanaal</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${channelStyle(order.kanaal)}`}>
                  {order.kanaal}
                </span>
              </div>
              <div>
                <p className="text-[12px] text-[#9CA3AF]">Aangemaakt</p>
                <p className="text-[15.5px] text-[#374151]">{formatDateShort(order.aangemaaktOp)}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#9CA3AF]">Bijgewerkt</p>
                <p className="text-[15.5px] text-[#374151]">{formatDateShort(order.bijgewerktOp)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Undo toast */}
      {undoAction && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#1F2937] text-white px-4 py-2.5 rounded-lg shadow-xl z-50 text-[15px] whitespace-nowrap">
          <span className="text-[#D1D5DB]">{undoAction.label}</span>
          <button
            onClick={async () => {
              dismissUndo()
              await undoAction.revert()
            }}
            className="font-semibold text-[#FCD34D] hover:text-[#FDE68A] transition-colors"
          >
            Ongedaan maken
          </button>
          <button onClick={dismissUndo} className="text-[#6B7280] hover:text-white transition-colors ml-1">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
