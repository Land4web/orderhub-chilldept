'use client'

import { useState, useEffect } from 'react'
import { getSyncLogs } from '@/lib/db/sync-logs'
import { CHANNEL_STYLE, SYNC_STYLE, SYNC_LABEL } from '@/lib/styles'
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import type { SyncLog, SyncStatus, Kanaal } from '@/lib/types/index'

function SyncStatusIcon({ status }: { status: SyncStatus }) {
  if (status === 'success') return <CheckCircle size={14} className="text-[#16A34A]" />
  if (status === 'warning') return <AlertCircle size={14} className="text-[#D97706]" />
  return <XCircle size={14} className="text-[#EF4444]" />
}

const TYPE_LABEL: Record<string, string> = {
  orders: 'Orders', voorraad: 'Voorraad', producten: 'Producten',
}
const TYPES = ['orders', 'voorraad', 'producten'] as const
const OVERALL_LABEL: Record<SyncStatus, string> = {
  success: 'Operationeel', warning: 'Waarschuwing', error: 'Fout',
}

const SYNC_CHANNELS: { kanaal: Kanaal; slug: string }[] = [
  { kanaal: 'WooCommerce', slug: 'woocommerce' },
  { kanaal: 'Mirakl', slug: 'mirakl' },
]
const ALL_CHANNELS: Kanaal[] = ['WooCommerce', 'bol.com', 'Mirakl', 'eBay']

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const prefix = d >= today ? 'Vandaag' : d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
  return `${prefix} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
}

export default function SynchronisatiePage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [syncing, setSyncing] = useState<Set<string>>(new Set())
  const [syncResults, setSyncResults] = useState<Record<string, string>>({})

  useEffect(() => { getSyncLogs().then(setSyncLogs) }, [])

  async function startSync(slug: string) {
    setSyncing(prev => new Set(prev).add(slug))
    setSyncResults(prev => ({ ...prev, [slug]: '' }))
    try {
      const res = await fetch(`/api/sync/${slug}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncResults(prev => ({ ...prev, [slug]: data.error ?? 'Fout' }))
      } else {
        setSyncResults(prev => ({ ...prev, [slug]: data.bericht }))
        getSyncLogs().then(setSyncLogs)
      }
    } catch {
      setSyncResults(prev => ({ ...prev, [slug]: 'Verbindingsfout' }))
    } finally {
      setSyncing(prev => { const s = new Set(prev); s.delete(slug); return s })
    }
  }

  async function syncAll() {
    await Promise.all(SYNC_CHANNELS.map(c => startSync(c.slug)))
  }

  const sorted = [...syncLogs].sort(
    (a, b) => new Date(b.uitgevoerdOp).getTime() - new Date(a.uitgevoerdOp).getTime()
  )

  const channelData = ALL_CHANNELS.map(kanaal => {
    const logs = sorted.filter(l => l.kanaal === kanaal)
    const overallStatus: SyncStatus = logs.some(l => l.status === 'error')
      ? 'error' : logs.some(l => l.status === 'warning') ? 'warning' : 'success'
    const typeRows = TYPES.map(type => ({ type, log: logs.find(l => l.type === type) }))
    return { kanaal, overallStatus, typeRows }
  })

  const anySync = syncing.size > 0

  return (
    <div className="py-7 px-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Synchronisatie</h1>
          <p className="text-base text-[#9CA3AF] mt-0.5">Status van alle kanaalintegraties</p>
        </div>
        <button
          onClick={syncAll}
          disabled={anySync}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15.5px] font-medium bg-[#0E2A3C] text-white rounded-md hover:bg-[#1a3f5c] disabled:opacity-60 transition-colors"
        >
          {anySync
            ? <><Loader2 size={12} className="animate-spin" /> Bezig…</>
            : <><RefreshCw size={12} /> Alles synchroniseren</>
          }
        </button>
      </div>

      {/* Per-channel cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {channelData.map(({ kanaal, overallStatus, typeRows }) => {
          const syncChannel = SYNC_CHANNELS.find(c => c.kanaal === kanaal)
          const slug = syncChannel?.slug
          const isSyncing = slug ? syncing.has(slug) : false
          const result = slug ? syncResults[slug] : undefined

          return (
            <div key={kanaal} className="bg-white rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB]">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${CHANNEL_STYLE[kanaal]}`}>
                  {kanaal}
                </span>
                <div className="flex items-center gap-2">
                  {syncChannel && (
                    <button
                      onClick={() => startSync(slug!)}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium border border-[#E5E7EB] rounded text-[#374151] bg-white hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
                    >
                      {isSyncing
                        ? <Loader2 size={10} className="animate-spin" />
                        : <RefreshCw size={10} />
                      }
                      Sync
                    </button>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium ${SYNC_STYLE[overallStatus]}`}>
                    <SyncStatusIcon status={overallStatus} />
                    {OVERALL_LABEL[overallStatus]}
                  </span>
                </div>
              </div>

              {result !== undefined && result !== '' && (
                <div className="px-4 py-2 border-b border-[#F3F4F6] text-[12px] text-[#6B7280] bg-[#F9FAFB]">
                  {result}
                </div>
              )}

              <div className="divide-y divide-[#F3F4F6]">
                {typeRows.map(({ type, log }) => (
                  <div key={type} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-[15.5px] font-medium text-[#111827]">{TYPE_LABEL[type]}</p>
                      {log ? (
                        <p className="text-[12px] text-[#9CA3AF] mt-0.5">
                          {log.aantalVerwerkt > 0 ? `${log.aantalVerwerkt} verwerkt` : ''}
                          {log.aantalFouten > 0 ? ` · ${log.aantalFouten} fout${log.aantalFouten !== 1 ? 'en' : ''}` : ''}
                          {log.aantalVerwerkt === 0 && log.aantalFouten === 0 ? log.bericht : ''}
                        </p>
                      ) : (
                        <p className="text-[12px] text-[#9CA3AF] mt-0.5">Niet uitgevoerd</p>
                      )}
                    </div>
                    <div className="text-right">
                      {log ? (
                        <>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${SYNC_STYLE[log.status]}`}>
                            {SYNC_LABEL[log.status]}
                          </span>
                          <p className="text-[12px] text-[#9CA3AF] mt-1">{formatTime(log.uitgevoerdOp)}</p>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium bg-[#F9FAFB] text-[#9CA3AF]">
                            Overgeslagen
                          </span>
                          <p className="text-[12px] text-[#9CA3AF] mt-1">—</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
