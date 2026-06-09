'use client'

import { use, useState, useEffect } from 'react'
import { getOrderById } from '@/lib/db/orders'
import type { Order } from '@/lib/types'

export default function FactuurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    getOrderById(id).then(setOrder)
  }, [id])

  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [order])

  if (!order) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#6B7280' }}>
        Laden…
      </div>
    )
  }

  const datum = new Date(order.aangemaaktOp).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const subtotaal = order.totaal
  const btwBedrag = subtotaal * 0.21 / 1.21
  const exclBtw = subtotaal - btwBedrag

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 15mm; }
          body { margin: 0; }
        }
        body { font-family: -apple-system, Arial, sans-serif; color: #111; background: white; margin: 0; }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 32px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#0E2A3C' }}>FACTUUR</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Factuurnummer: {order.id}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0E2A3C' }}>Chill-Dept</div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
              info@chill-dept.nl
            </div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 40, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Factuurdatum</div>
            <div style={{ fontSize: 15 }}>{datum}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Kanaal</div>
            <div style={{ fontSize: 15 }}>{order.kanaal} · {order.kanaalOrderId}</div>
          </div>
        </div>

        <div style={{ height: 1, background: '#E5E7EB', marginBottom: 32 }} />

        {/* Customer */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Factuuradres</div>
          <div style={{ fontSize: 15, lineHeight: 1.7 }}>
            <strong>{order.klantNaam}</strong><br />
            {order.klantEmail && <>{order.klantEmail}<br /></>}
            {order.klantAdres}<br />
            {order.klantPostcode} {order.klantStad}<br />
            {order.klantLand}
          </div>
        </div>

        {/* Products */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Artikelen</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 12, fontWeight: 600, color: '#6B7280', paddingRight: 16 }}>SKU</th>
                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Product</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Aantal</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 12, fontWeight: 600, color: '#6B7280', paddingLeft: 16 }}>Stukprijs</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 12, fontWeight: 600, color: '#6B7280', paddingLeft: 16 }}>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {order.regels.map((regel, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '10px 16px 10px 0', fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{regel.sku}</td>
                  <td style={{ padding: '10px 0', fontSize: 14 }}>{regel.naam}</td>
                  <td style={{ padding: '10px 0', fontSize: 14, textAlign: 'right' }}>{regel.aantal}</td>
                  <td style={{ padding: '10px 0 10px 16px', fontSize: 14, textAlign: 'right', color: '#6B7280' }}>€{regel.prijs.toFixed(2)}</td>
                  <td style={{ padding: '10px 0 10px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>€{(regel.prijs * regel.aantal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 240 }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px 0', fontSize: 13, color: '#6B7280', paddingRight: 32 }}>Subtotaal (excl. BTW)</td>
                <td style={{ padding: '5px 0', fontSize: 13, textAlign: 'right' }}>€{exclBtw.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 0', fontSize: 13, color: '#6B7280', paddingRight: 32 }}>BTW (21%)</td>
                <td style={{ padding: '5px 0', fontSize: 13, textAlign: 'right' }}>€{btwBedrag.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #E5E7EB' }}>
                <td style={{ padding: '10px 0 5px', fontSize: 15, fontWeight: 700, paddingRight: 32 }}>Totaal</td>
                <td style={{ padding: '10px 0 5px', fontSize: 15, fontWeight: 700, textAlign: 'right' }}>€{subtotaal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Print button */}
        <div className="no-print" style={{ marginTop: 40, textAlign: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '10px 24px', background: '#0E2A3C', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Afdrukken
          </button>
        </div>
      </div>
    </>
  )
}
