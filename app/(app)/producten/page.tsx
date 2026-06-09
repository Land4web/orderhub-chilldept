'use client'

import { useState, useEffect } from 'react'
import { getProducts } from '@/lib/db/products'
import { getVoorraad } from '@/lib/db/voorraad'
import { CHANNEL_STYLE } from '@/lib/styles'
import { Search, AlertTriangle, Package, TrendingDown, XCircle } from 'lucide-react'
import type { Product, Voorraad } from '@/lib/types'

function StockBar({ vrij, beschikbaar, isLow, isOut }: { vrij: number; beschikbaar: number; isLow: boolean; isOut: boolean }) {
  const maxRef = Math.max(beschikbaar, 30)
  const pct = beschikbaar === 0 ? 0 : Math.min(100, (vrij / maxRef) * 100)
  const color = isOut ? '#EF4444' : isLow ? '#F59E0B' : '#22C55E'
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-16 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden flex-shrink-0">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </span>
      {isOut ? (
        <span className="text-[12.5px] font-medium text-[#EF4444]">Uitverkocht</span>
      ) : isLow ? (
        <span className="text-[12.5px] font-medium text-[#F59E0B]">{vrij} ⚠</span>
      ) : (
        <span className="text-[12.5px] text-[#374151]">{vrij}</span>
      )}
    </div>
  )
}

export default function ProductenPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [voorraad, setVoorraad] = useState<Voorraad[]>([])
  const [search, setSearch] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')

  useEffect(() => {
    getProducts().then(setProducts)
    getVoorraad().then(setVoorraad)
  }, [])

  const categories = [...new Set(products.map(p => p.categorie))].sort()

  const enriched = products.map(p => {
    const stock = voorraad.find(v => v.sku === p.sku)
    return { ...p, stock }
  })

  const filtered = enriched.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.naam.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    const matchCat = !categorieFilter || p.categorie === categorieFilter
    return matchSearch && matchCat
  })

  const lowStock = enriched.filter(p => p.stock && p.stock.beschikbaar > 0 && p.stock.beschikbaar <= p.stock.minimumDrempel)
  const outOfStock = enriched.filter(p => p.stock && p.stock.beschikbaar === 0)
  const outSkus = outOfStock.map(p => p.sku).join(', ')

  return (
    <div className="py-7 px-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Producten & Voorraad</h1>
          <p className="text-base text-[#9CA3AF] mt-0.5">{products.length} SKUs actief</p>
        </div>
        <button className="inline-flex items-center px-3 py-1.5 text-[15.5px] font-medium border border-[#E5E7EB] rounded-md text-[#374151] bg-white hover:bg-[#F9FAFB] transition-colors">
          Exporteren
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={13} className="text-[#9CA3AF]" />
            <span className="text-[12.5px] text-[#6B7280]">Totale SKUs</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{products.length}</p>
          <p className="text-[12px] text-[#6B7280]">{products.length - outOfStock.length} actief · {outOfStock.length} inactief</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={13} className="text-[#F59E0B]" />
            <span className="text-[12.5px] text-[#6B7280]">Lage voorraad</span>
          </div>
          <p className="text-[26px] font-semibold text-[#F59E0B] leading-none mb-1.5">{lowStock.length}</p>
          <p className="text-[12px] text-[#6B7280]">Onder minimumdrempel</p>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={13} className="text-[#EF4444]" />
            <span className="text-[12.5px] text-[#6B7280]">Uitverkocht</span>
          </div>
          <p className="text-[26px] font-semibold text-[#EF4444] leading-none mb-1.5">{outOfStock.length}</p>
          <p className="text-[12px] text-[#6B7280] font-mono truncate" title={outSkus}>{outSkus || '—'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek op naam of SKU..."
            className="pl-8 pr-3 py-1.5 text-[15.5px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors w-[220px]"
          />
        </div>
        <select
          value={categorieFilter}
          onChange={e => setCategorieFilter(e.target.value)}
          className="text-[15.5px] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
        >
          <option value="">Alle categorieën</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden md:table-cell">Categorie</th>
                <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Beschikbaar</th>
                <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden sm:table-cell">Gereserveerd</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Vrij</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden lg:table-cell">Locatie</th>
                <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide hidden lg:table-cell">Kanalen</th>
                <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Prijs</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-[15.5px] text-[#9CA3AF]">Laden…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-[15.5px] text-[#9CA3AF]">Geen producten gevonden</td></tr>
              ) : (
                filtered.map(product => {
                  const beschikbaar = product.stock?.beschikbaar ?? 0
                  const gereserveerd = product.stock?.gereserveerd ?? 0
                  const drempel = product.stock?.minimumDrempel ?? 0
                  const vrij = beschikbaar - gereserveerd
                  const isOut = beschikbaar === 0
                  const isLow = !isOut && beschikbaar <= drempel
                  return (
                    <tr key={product.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-2.5 text-[12px] text-[#9CA3AF] font-mono whitespace-nowrap">{product.sku}</td>
                      <td className="px-4 py-2.5">
                        <p className="text-[15.5px] font-medium text-[#111827]">{product.naam}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[15.5px] text-[#6B7280] hidden md:table-cell">{product.categorie}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-[15.5px] font-medium ${isLow || isOut ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                          {beschikbaar}
                        </span>
                        {(isLow || isOut) && <AlertTriangle size={11} className="inline ml-1 text-[#EF4444]" />}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[15.5px] text-[#6B7280] hidden sm:table-cell">
                        {gereserveerd}
                      </td>
                      <td className="px-4 py-2.5">
                        {product.stock ? (
                          <StockBar vrij={vrij} beschikbaar={beschikbaar} isLow={isLow} isOut={isOut} />
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12.5px] text-[#6B7280] font-mono hidden lg:table-cell">
                        {product.stock?.locatie ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {product.kanalen.map(k => (
                            <span key={k} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${CHANNEL_STYLE[k]}`}>
                              {k === 'WooCommerce' ? 'WC' : k === 'bol.com' ? 'bol' : k === 'Mirakl' ? 'MRK' : 'eBay'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[15.5px] font-medium text-[#111827]">
                        €{product.verkoopprijs.toFixed(2)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
