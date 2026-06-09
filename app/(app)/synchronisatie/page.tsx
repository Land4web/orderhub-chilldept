'use client'

import { useState, useEffect } from 'react'
import { getSyncLogs } from '@/lib/db/sync-logs'
import { CHANNEL_STYLE, SYNC_STYLE, SYNC_LABEL } from '@/lib/styles'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import type { SyncLog, SyncStatus, Kanaal } from '@/lib/types/index'

function SyncStatusIcon({ status }: { status: SyncStatus }) {
  if (status === 'success') return <CheckCircle size={14} className="text-[#16A34A]" />
  if (status === 'warning') return <AlertCircle size={14} className="text-[#D97706]" />
  return <XCircle size={14} className="text-[#EF4444]" />
}

const TYPE_LABEL: Record<string, string> = {
  orders: 'Orders',
  voorraad: 'Voorraad',
  producten: 'Producten',
}

const TYPES = ['orders', 'voorraad', 'producten'] as const

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const prefix = d >= today ? 'Vandaag' : d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return `${prefix} ${time}`
}

const channels: Kanaal[] = ['WooCommerce', 'bol.com', 'Mirakl', 'eBay']

export default function SynchronisatiePage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])

  useEffect(() => { getSyncLogs().then(setSyncLogs) }, [])

  const sorted = [...syncLogs].sort(
    (a, b) => new Date(b.uitgevoerdOp).getTime() - new Date(a.uitgevoerdOp).getTime()
  )

  const channelData = channels.map(kanaal => {
    const logs = sorted.filter(l => l.kanaal === kanaal)
    const overallStatus: SyncStatus = logs.some(l => l.status === 'error')
      ? 'error' : logs.some(l => l.status === 'warning') ? 'warning' : 'success'

    const typeRows = TYPES.map(type => {
      const log = logs.find(l => l.type === type)
      return { type, log }
    })

    return { kanaal, overallStatus, typeRows }
  })

  const OVERALL_LABEL: Record<SyncStatus, string> = {
    success: 'Operationeel',
    warning: 'Waarschuwing',
    error: 'Fout',
  }

  return (
    <div className="py-7 px-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Synchronisatie</h1>
          <p className="text-base text-[#9CA3AF] mt-0.5">Status van alle kanaalintegraties</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15.5px] font-medium bg-[#0E2A3C] text-white rounded-md hover:bg-[#1a3f5c] transition-colors">
          <RefreshCw size={12} />
          Alles synchroniseren
        </button>
      </div>

      {/* Per-channel cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {channelData.map(({ kanaal, overallStatus, typeRows }) => (
          <div key={kanaal} className="bg-white rounded-lg border border-[#E5E7EB]">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB]">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${CHANNEL_STYLE[kanaal]}`}>
                {kanaal}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium ${SYNC_STYLE[overallStatus]}`}>
                <SyncStatusIcon status={overallStatus} />
                {OVERALL_LABEL[overallStatus]}
              </span>
            </div>

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
        ))}
      </div>
    </div>
  )
}
