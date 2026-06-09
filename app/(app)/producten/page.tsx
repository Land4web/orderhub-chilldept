'use client'

import { useState, useEffect, useRef } from 'react'
import { getProducts } from '@/lib/db/products'
import { getVoorraad } from '@/lib/db/voorraad'
import { getAllKanaalConfigs } from '@/lib/actions/kanaal-config'
import { saveProduct, deleteProduct } from '@/lib/actions/products'
import type { ProductFormData } from '@/lib/actions/products'
import { Search, AlertTriangle, Package, TrendingDown, XCircle, Plus, X, ChevronDown } from 'lucide-react'
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

const emptyForm: ProductFormData = {
  sku: '', naam: '', categorie: '', verkoopprijs: 0, inkoopprijs: 0,
  gewicht: 0, actief: true, kanalen: [], beschikbaar: 0, gereserveerd: 0, minimumDrempel: 5, locatie: '',
}

export default function ProductenPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [voorraad, setVoorraad] = useState<Voorraad[]>([])
  const [wcKanalen, setWcKanalen] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [categorieFilter, setCategorieFilter] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelData, setPanelData] = useState<ProductFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ kanaal: string; verwerkt: number; fouten: number } | null>(null)
  const importRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    reload()
    getAllKanaalConfigs().then(rows => setWcKanalen(rows.filter(r => r.type === 'woocommerce').map(r => r.kanaal)))
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (importRef.current && !importRef.current.contains(e.target as Node)) setImportOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function reload() {
    Promise.all([getProducts(), getVoorraad()]).then(([p, v]) => { setProducts(p); setVoorraad(v) })
  }

  const categories = [...new Set(products.map(p => p.categorie))].filter(Boolean).sort()

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

  function openNew() {
    setPanelData({ ...emptyForm })
    setPanelError(null)
    setDeleteConfirm(false)
    setPanelOpen(true)
  }

  function openEdit(product: typeof enriched[0]) {
    setPanelData({
      id: product.id,
      sku: product.sku,
      naam: product.naam,
      categorie: product.categorie,
      verkoopprijs: product.verkoopprijs,
      inkoopprijs: product.inkoopprijs,
      gewicht: product.gewicht,
      actief: product.actief,
      kanalen: product.kanalen,
      beschikbaar: product.stock?.beschikbaar ?? 0,
      gereserveerd: product.stock?.gereserveerd ?? 0,
      minimumDrempel: product.stock?.minimumDrempel ?? 5,
      locatie: product.stock?.locatie ?? '',
    })
    setPanelError(null)
    setDeleteConfirm(false)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setDeleteConfirm(false)
  }

  function setField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setPanelData(d => ({ ...d, [key]: value }))
  }

  async function handleSave() {
    if (!panelData.sku.trim()) { setPanelError('SKU is verplicht'); return }
    if (!panelData.naam.trim()) { setPanelError('Naam is verplicht'); return }
    setSaving(true)
    setPanelError(null)
    const { error } = await saveProduct(panelData)
    setSaving(false)
    if (error) { setPanelError(error); return }
    closePanel()
    reload()
  }

  async function handleDelete() {
    if (!panelData.id) return
    setSaving(true)
    await deleteProduct(panelData.id, panelData.sku)
    setSaving(false)
    closePanel()
    reload()
  }

  async function handleImport(kanaal: string) {
    setImportOpen(false)
    setImporting(kanaal)
    setImportResult(null)
    try {
      const res = await fetch(`/api/products/import/${encodeURIComponent(kanaal)}`, { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setImportResult({ kanaal, verwerkt: data.verwerkt, fouten: data.fouten })
      reload()
    } catch (err) {
      setImportResult({ kanaal, verwerkt: 0, fouten: -1 })
      console.error(err)
    } finally {
      setImporting(null)
    }
  }

  return (
    <div className="py-7 px-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Producten & Voorraad</h1>
          <p className="text-base text-[#9CA3AF] mt-0.5">{products.length} SKUs</p>
        </div>
        <div className="flex gap-2 items-center">
          {importResult && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[14px] border ${importResult.fouten === -1 ? 'border-[#FECACA] bg-[#FEF2F2] text-[#EF4444]' : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]'}`}>
              {importResult.fouten === -1
                ? 'Import mislukt'
                : `${importResult.verwerkt} producten geïmporteerd${importResult.fouten > 0 ? `, ${importResult.fouten} fouten` : ''}`}
              <button onClick={() => setImportResult(null)} className="ml-1 opacity-60 hover:opacity-100"><X size={12} /></button>
            </div>
          )}
          {wcKanalen.length > 0 && (
            <div ref={importRef} className="relative">
              <button
                onClick={() => wcKanalen.length === 1 ? handleImport(wcKanalen[0]) : setImportOpen(o => !o)}
                disabled={!!importing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15.5px] font-medium border border-[#E5E7EB] rounded-md text-[#374151] bg-white hover:bg-[#F9FAFB] disabled:opacity-60 transition-colors"
              >
                {importing ? `Importeren…` : 'Importeer van WooCommerce'}
                {wcKanalen.length > 1 && <ChevronDown size={13} />}
              </button>
              {importOpen && wcKanalen.length > 1 && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 py-1">
                  <p className="px-3 py-1.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Kies kanaal</p>
                  {wcKanalen.map(k => (
                    <button
                      key={k}
                      onClick={() => handleImport(k)}
                      className="w-full text-left px-3 py-1.5 text-[14px] text-[#374151] hover:bg-[#F9FAFB] transition-colors"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15.5px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] transition-colors"
          >
            <Plus size={14} />
            Product toevoegen
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={13} className="text-[#9CA3AF]" />
            <span className="text-[12.5px] text-[#6B7280]">Totale SKUs</span>
          </div>
          <p className="text-[26px] font-semibold text-[#111827] leading-none mb-1.5">{products.length}</p>
          <p className="text-[12px] text-[#6B7280]">{products.filter(p => p.actief).length} actief · {outOfStock.length} uitverkocht</p>
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
                <th className="text-right px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide">Prijs</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-[15.5px] text-[#9CA3AF]">Laden…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-[15.5px] text-[#9CA3AF]">Geen producten gevonden</td></tr>
              ) : (
                filtered.map(product => {
                  const beschikbaar = product.stock?.beschikbaar ?? 0
                  const gereserveerd = product.stock?.gereserveerd ?? 0
                  const drempel = product.stock?.minimumDrempel ?? 0
                  const vrij = beschikbaar - gereserveerd
                  const isOut = beschikbaar === 0
                  const isLow = !isOut && beschikbaar <= drempel
                  return (
                    <tr
                      key={product.id}
                      onClick={() => openEdit(product)}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-[12px] text-[#9CA3AF] font-mono whitespace-nowrap">{product.sku}</td>
                      <td className="px-4 py-2.5">
                        <p className="text-[15.5px] font-medium text-[#111827]">{product.naam}</p>
                        {!product.actief && <span className="text-[11px] text-[#9CA3AF]">Inactief</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[15.5px] text-[#6B7280] hidden md:table-cell">{product.categorie}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-[15.5px] font-medium ${isLow || isOut ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                          {beschikbaar}
                        </span>
                        {(isLow || isOut) && <AlertTriangle size={11} className="inline ml-1 text-[#EF4444]" />}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[15.5px] text-[#6B7280] hidden sm:table-cell">{gereserveerd}</td>
                      <td className="px-4 py-2.5">
                        {product.stock ? (
                          <StockBar vrij={vrij} beschikbaar={beschikbaar} isLow={isLow} isOut={isOut} />
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12.5px] text-[#6B7280] font-mono hidden lg:table-cell">
                        {product.stock?.locatie || '—'}
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

      {/* Slide-in panel backdrop */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={closePanel} />
      )}

      {/* Slide-in panel */}
      <div className={`fixed top-0 right-0 h-full w-[420px] bg-white border-l border-[#E5E7EB] shadow-xl z-50 flex flex-col transition-transform duration-200 ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] flex-shrink-0">
          <h2 className="text-[16px] font-semibold text-[#111827]">
            {panelData.id ? 'Product bewerken' : 'Nieuw product'}
          </h2>
          <button onClick={closePanel} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Productinformatie */}
          <div>
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Productinformatie</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">SKU *</label>
                <input
                  value={panelData.sku}
                  onChange={e => setField('sku', e.target.value)}
                  disabled={!!panelData.id}
                  placeholder="Bijv. CD-HOODIE-BLK-M"
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors font-mono disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Naam *</label>
                <input
                  value={panelData.naam}
                  onChange={e => setField('naam', e.target.value)}
                  placeholder="Productnaam"
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Categorie</label>
                <input
                  value={panelData.categorie}
                  onChange={e => setField('categorie', e.target.value)}
                  list="categorie-opties"
                  placeholder="Bijv. Hoodies"
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
                <datalist id="categorie-opties">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <label className="text-[14px] text-[#374151]">Actief</label>
                <button
                  type="button"
                  onClick={() => setField('actief', !panelData.actief)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${panelData.actief ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${panelData.actief ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Prijzen */}
          <div>
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Prijzen</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Verkoopprijs (€)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={panelData.verkoopprijs}
                  onChange={e => setField('verkoopprijs', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Inkoopprijs (€)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={panelData.inkoopprijs}
                  onChange={e => setField('inkoopprijs', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Gewicht (kg)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={panelData.gewicht}
                  onChange={e => setField('gewicht', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Voorraad */}
          <div>
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Voorraad</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Beschikbaar</label>
                <input
                  type="number" min="0"
                  value={panelData.beschikbaar}
                  onChange={e => setField('beschikbaar', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Gereserveerd</label>
                <input
                  type="number" min="0"
                  value={panelData.gereserveerd}
                  onChange={e => setField('gereserveerd', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Minimumdrempel</label>
                <input
                  type="number" min="0"
                  value={panelData.minimumDrempel}
                  onChange={e => setField('minimumDrempel', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B7280] mb-1">Locatie</label>
                <input
                  value={panelData.locatie}
                  onChange={e => setField('locatie', e.target.value)}
                  placeholder="Bijv. A1-03"
                  className="w-full px-3 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] transition-colors"
                />
              </div>
            </div>
          </div>

          {panelError && (
            <p className="text-[14px] text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] rounded-md px-3 py-2">
              {panelError}
            </p>
          )}
        </div>

        {/* Panel footer */}
        <div className="px-5 py-4 border-t border-[#E5E7EB] space-y-2 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-[15px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
            <button
              onClick={closePanel}
              className="px-4 py-2 text-[15px] border border-[#E5E7EB] rounded-md text-[#374151] hover:bg-[#F9FAFB] transition-colors"
            >
              Annuleren
            </button>
          </div>
          {panelData.id && (
            deleteConfirm ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-md">
                <span className="text-[13px] text-[#EF4444] flex-1">Product permanent verwijderen?</span>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-[13px] font-semibold text-white bg-[#EF4444] px-2.5 py-1 rounded hover:bg-[#DC2626] transition-colors"
                >
                  Ja
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="text-[13px] text-[#6B7280] hover:text-[#374151] transition-colors"
                >
                  Nee
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full py-2 text-[15px] font-medium border border-[#FECACA] text-[#EF4444] rounded-md hover:bg-[#FEF2F2] transition-colors"
              >
                Product verwijderen
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
