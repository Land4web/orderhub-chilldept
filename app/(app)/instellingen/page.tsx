'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getProfiles, updateUserRole, createUser, deleteUser, updateUserProfile, adminResetPassword, updateOwnPassword } from '@/lib/actions/users'
import { getAllKanaalConfigs, saveKanaalConfig, deleteKanaalConfig } from '@/lib/actions/kanaal-config'
import { ROLE_LABELS } from '@/lib/auth'
import { Users, Settings, Shield, Trash2, Plus, Check, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import type { Role } from '@/lib/auth'
import type { Profile } from '@/lib/actions/users'
import type { KanaalConfigRow, KanaalType } from '@/lib/types'

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-[#0E2A3C] text-white',
  employee: 'bg-[#F9FAFB] text-[#6B7280]',
  fulfillment: 'bg-[#FFF7ED] text-[#D97706]',
}

const ALL_ROLES: Role[] = ['admin', 'employee', 'fulfillment']

const EMPTY_FORM = { email: '', password: '', name: '', initials: '', role: 'employee' as Role }

const EMPTY_WC_CONFIG = { url: '', consumer_key: '', consumer_secret: '' }
const EMPTY_MIRAKL_CONFIG = { url: '', api_key: '' }

const ADAPTER_LABEL: Record<KanaalType, string> = {
  woocommerce: 'WooCommerce',
  mirakl: 'Mirakl',
}

function KanaalCard({
  row,
  onSaved,
  onDeleted,
}: {
  row: KanaalConfigRow
  onSaved: () => void
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(
    row.type === 'woocommerce' ? { ...EMPTY_WC_CONFIG } : { ...EMPTY_MIRAKL_CONFIG }
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const configured = !!(row.config?.url && (
    row.type === 'woocommerce' ? row.config.consumer_key : row.config.api_key
  ))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await saveKanaalConfig(row.kanaal, row.type, form)
    setSaving(false)
    if (!result.error) {
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 2500)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Weet je zeker dat je "${row.kanaal}" wil verwijderen?`)) return
    setDeleting(true)
    await deleteKanaalConfig(row.kanaal)
    onDeleted()
  }

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB]">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-[15.5px] font-semibold text-[#111827]">{row.kanaal}</p>
          <p className="text-[12px] text-[#9CA3AF]">{ADAPTER_LABEL[row.type]} adapter</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
            configured ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F9FAFB] text-[#9CA3AF]'
          }`}>
            {configured ? 'Geconfigureerd' : 'Niet geconfigureerd'}
          </span>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1.5 text-[#9CA3AF] hover:text-[#374151] transition-colors"
          >
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] disabled:opacity-40 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSave} className="px-4 pb-4 pt-1 border-t border-[#F3F4F6] space-y-3">
          <div>
            <label className="text-[12px] text-[#6B7280] font-medium block mb-1">
              {row.type === 'woocommerce' ? 'Store URL' : 'Marketplace URL'}
            </label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder={configured ? row.config.url : 'https://...'}
              className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
            />
          </div>

          {row.type === 'woocommerce' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Consumer Key</label>
                <input
                  type="password"
                  value={form.consumer_key}
                  onChange={e => setForm(f => ({ ...f, consumer_key: e.target.value }))}
                  placeholder={configured ? '••••••••' : 'ck_...'}
                  className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Consumer Secret</label>
                <input
                  type="password"
                  value={form.consumer_secret}
                  onChange={e => setForm(f => ({ ...f, consumer_secret: e.target.value }))}
                  placeholder={configured ? '••••••••' : 'cs_...'}
                  className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[12px] text-[#6B7280] font-medium block mb-1">API Key</label>
              <input
                type="password"
                value={form.api_key}
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder={configured ? '••••••••' : 'Mirakl API key'}
                className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !form.url}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[15px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] disabled:opacity-50 transition-colors"
          >
            {saved ? <><Check size={13} /> Opgeslagen</> : saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </form>
      )}
    </div>
  )
}

const EMPTY_NIEUW = { naam: '', type: 'mirakl' as KanaalType }

export default function InstellingenPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'gebruikers' | 'account' | 'kanalen'>('gebruikers')

  // Gebruikers
  const [team, setTeam] = useState<Profile[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [addError, setAddError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', initials: '', newPassword: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Mijn account
  const [ownName, setOwnName] = useState('')
  const [ownInitials, setOwnInitials] = useState('')
  const [ownProfileSaving, setOwnProfileSaving] = useState(false)
  const [ownProfileSaved, setOwnProfileSaved] = useState(false)
  const [ownNewPass, setOwnNewPass] = useState('')
  const [ownConfirmPass, setOwnConfirmPass] = useState('')
  const [ownPassSaving, setOwnPassSaving] = useState(false)
  const [ownPassError, setOwnPassError] = useState('')
  const [ownPassSuccess, setOwnPassSuccess] = useState(false)

  // Kanalen
  const [kanalen, setKanalen] = useState<KanaalConfigRow[]>([])
  const [kanalenLoading, setKanalenLoading] = useState(false)
  const [nieuwOpen, setNieuwOpen] = useState(false)
  const [nieuwForm, setNieuwForm] = useState(EMPTY_NIEUW)
  const [nieuwError, setNieuwError] = useState('')
  const [nieuwSubmitting, setNieuwSubmitting] = useState(false)

  function loadTeam() {
    setTeamLoading(true)
    getProfiles().then(profiles => {
      setTeam(profiles)
      setTeamLoading(false)
    })
  }

  function loadKanalen() {
    setKanalenLoading(true)
    getAllKanaalConfigs().then(rows => {
      setKanalen(rows)
      setKanalenLoading(false)
    })
  }

  useEffect(() => {
    if (user?.role !== 'admin') return
    loadTeam()
  }, [user?.role])

  useEffect(() => {
    if (user) { setOwnName(user.name); setOwnInitials(user.initials) }
  }, [user])

  useEffect(() => {
    if (activeTab === 'kanalen') loadKanalen()
  }, [activeTab])

  async function handleRoleChange(id: string, role: Role) {
    setTeam(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    await updateUserRole(id, role)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setSubmitting(true)
    const { error } = await createUser(
      addForm.email, addForm.password, addForm.name, addForm.initials, addForm.role
    )
    setSubmitting(false)
    if (error) {
      setAddError(error)
    } else {
      setAddOpen(false)
      setAddForm(EMPTY_FORM)
      loadTeam()
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Weet je zeker dat je ${name} wil verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    setDeletingId(id)
    const { error } = await deleteUser(id)
    setDeletingId(null)
    if (!error) setTeam(prev => prev.filter(m => m.id !== id))
  }

  function openEdit(member: Profile) {
    if (editingId === member.id) { setEditingId(null); return }
    setEditingId(member.id)
    setEditForm({ name: member.name, initials: member.initials, newPassword: '' })
    setEditError('')
  }

  async function handleEditSave(id: string) {
    setEditSaving(true)
    setEditError('')
    const { error: profileErr } = await updateUserProfile(id, editForm.name, editForm.initials)
    if (profileErr) { setEditError(profileErr); setEditSaving(false); return }
    if (editForm.newPassword) {
      const { error: passErr } = await adminResetPassword(id, editForm.newPassword)
      if (passErr) { setEditError(passErr); setEditSaving(false); return }
    }
    setEditSaving(false)
    setEditingId(null)
    setTeam(prev => prev.map(m => m.id === id ? { ...m, name: editForm.name, initials: editForm.initials } : m))
  }

  async function handleOwnProfileSave() {
    setOwnProfileSaving(true)
    await updateUserProfile(user!.id, ownName, ownInitials)
    setOwnProfileSaving(false)
    setOwnProfileSaved(true)
    setTimeout(() => setOwnProfileSaved(false), 2500)
  }

  async function handleOwnPasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setOwnPassError('')
    if (ownNewPass.length < 6) { setOwnPassError('Wachtwoord moet minimaal 6 tekens zijn'); return }
    if (ownNewPass !== ownConfirmPass) { setOwnPassError('Wachtwoorden komen niet overeen'); return }
    setOwnPassSaving(true)
    const { error } = await updateOwnPassword(ownNewPass)
    setOwnPassSaving(false)
    if (error) { setOwnPassError(error) } else {
      setOwnNewPass(''); setOwnConfirmPass('')
      setOwnPassSuccess(true)
      setTimeout(() => setOwnPassSuccess(false), 3000)
    }
  }

  async function handleNieuwKanaal(e: React.FormEvent) {
    e.preventDefault()
    setNieuwError('')
    if (!nieuwForm.naam.trim()) { setNieuwError('Naam is verplicht'); return }
    if (kanalen.some(k => k.kanaal.toLowerCase() === nieuwForm.naam.trim().toLowerCase())) {
      setNieuwError('Een kanaal met deze naam bestaat al')
      return
    }
    setNieuwSubmitting(true)
    const result = await saveKanaalConfig(nieuwForm.naam.trim(), nieuwForm.type, {})
    setNieuwSubmitting(false)
    if (result.error) {
      setNieuwError(result.error)
    } else {
      setNieuwOpen(false)
      setNieuwForm(EMPTY_NIEUW)
      loadKanalen()
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="py-7 px-8 max-w-2xl mx-auto">
        <h1 className="text-lg font-semibold text-[#111827] mb-4">Instellingen</h1>
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-8 text-center">
          <Shield size={32} className="text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-[15.5px] text-[#6B7280]">Je hebt geen toegang tot de instellingen.</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Neem contact op met een beheerder.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-7 px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#111827]">Instellingen</h1>
        <p className="text-base text-[#9CA3AF] mt-0.5">Beheer van accounts en configuratie</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-lg p-1 mb-6 w-fit">
        {([
          { key: 'gebruikers', label: 'Gebruikers', icon: Users },
          { key: 'account', label: 'Mijn account', icon: Settings },
          { key: 'kanalen', label: 'Kanalen', icon: Settings },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[15.5px] font-medium transition-colors ${
              activeTab === key ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Gebruikersbeheer */}
      {activeTab === 'gebruikers' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[#9CA3AF]" />
              <h2 className="text-[16px] font-semibold text-[#111827]">Gebruikers</h2>
              <span className="text-[12px] text-[#9CA3AF]">{team.length} accounts</span>
            </div>
            <button
              onClick={() => { setAddOpen(o => !o); setAddError('') }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15px] font-medium bg-[#0E2A3C] text-white rounded-md hover:bg-[#1a3f5c] transition-colors"
            >
              <Plus size={13} />
              Toevoegen
            </button>
          </div>

          {addOpen && (
            <form onSubmit={handleAdd} className="px-4 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[12px] text-[#6B7280] font-medium block mb-1">E-mailadres</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="naam@bedrijf.nl"
                    className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Wachtwoord</label>
                  <input
                    type="password"
                    required
                    value={addForm.password}
                    onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 6 tekens"
                    className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Naam</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Volledige naam"
                    className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Initialen</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={addForm.initials}
                    onChange={e => setAddForm(f => ({ ...f, initials: e.target.value.toUpperCase() }))}
                    placeholder="ML"
                    className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Rol</label>
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm(f => ({ ...f, role: e.target.value as Role }))}
                    className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white text-[#374151]"
                  >
                    {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
              </div>
              {addError && <p className="text-[13px] text-[#EF4444] mb-3">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-[15px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Aanmaken…' : 'Gebruiker aanmaken'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddOpen(false); setAddError('') }}
                  className="px-4 py-1.5 text-[15px] font-medium border border-[#E5E7EB] rounded-md text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-[#F3F4F6]">
            {teamLoading ? (
              <div className="px-4 py-6 text-center text-[15px] text-[#9CA3AF]">Laden…</div>
            ) : team.length === 0 ? (
              <div className="px-4 py-6 text-center text-[15px] text-[#9CA3AF]">Geen gebruikers gevonden</div>
            ) : team.map(member => (
              <div key={member.id}>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#E8A000] flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-white">{member.initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15.5px] font-medium text-[#111827]">{member.name}</p>
                      <p className="text-[12px] text-[#9CA3AF]">{member.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member.id, e.target.value as Role)}
                      className="text-[13px] border border-[#E5E7EB] rounded-md px-2 py-1 outline-none focus:border-[#E8A000] bg-white text-[#374151]"
                    >
                      {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    <button
                      onClick={() => openEdit(member)}
                      title="Profiel bewerken"
                      className={`p-1.5 transition-colors ${editingId === member.id ? 'text-[#E8A000]' : 'text-[#9CA3AF] hover:text-[#374151]'}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id, member.name)}
                      disabled={deletingId === member.id || member.id === user?.id}
                      title={member.id === user?.id ? 'Je kunt jezelf niet verwijderen' : 'Verwijderen'}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {editingId === member.id && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#F3F4F6] bg-[#F9FAFB]">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Naam</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Initialen</label>
                        <input
                          type="text"
                          maxLength={3}
                          value={editForm.initials}
                          onChange={e => setEditForm(f => ({ ...f, initials: e.target.value.toUpperCase() }))}
                          className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Nieuw wachtwoord <span className="text-[#C4C9D4] font-normal">(optioneel)</span></label>
                        <input
                          type="password"
                          value={editForm.newPassword}
                          onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                          placeholder="Laat leeg om niet te wijzigen"
                          className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                        />
                      </div>
                    </div>
                    {editError && <p className="text-[13px] text-[#EF4444] mb-3">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSave(member.id)}
                        disabled={editSaving || !editForm.name}
                        className="px-4 py-1.5 text-[15px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] disabled:opacity-50 transition-colors"
                      >
                        {editSaving ? 'Opslaan…' : 'Opslaan'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-1.5 text-[15px] font-medium border border-[#E5E7EB] rounded-md text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mijn account */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#E5E7EB]">
            <Settings size={14} className="text-[#9CA3AF]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">Mijn account</h2>
          </div>
          <div className="px-4 py-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#E8A000] flex items-center justify-center flex-shrink-0">
                <span className="text-base font-bold text-white">{user?.initials}</span>
              </div>
              <div>
                <p className="font-medium text-[#111827]">{user?.name}</p>
                <p className="text-[15.5px] text-[#9CA3AF]">{user?.email}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium mt-1 ${ROLE_BADGE[user!.role]}`}>
                  {ROLE_LABELS[user!.role]}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-[#F3F4F6] space-y-4">
              <div>
                <p className="text-[13px] font-medium text-[#374151] mb-2">Profiel</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Naam</label>
                    <input
                      type="text"
                      value={ownName}
                      onChange={e => setOwnName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Initialen</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={ownInitials}
                      onChange={e => setOwnInitials(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleOwnProfileSave}
                  disabled={ownProfileSaving || !ownName}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[15px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] disabled:opacity-50 transition-colors"
                >
                  {ownProfileSaved ? <><Check size={13} /> Opgeslagen</> : ownProfileSaving ? 'Opslaan…' : 'Opslaan'}
                </button>
              </div>
              <div className="pt-3 border-t border-[#F3F4F6]">
                <p className="text-[13px] font-medium text-[#374151] mb-2">Wachtwoord wijzigen</p>
                <form onSubmit={handleOwnPasswordChange} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Nieuw wachtwoord</label>
                      <input
                        type="password"
                        value={ownNewPass}
                        onChange={e => setOwnNewPass(e.target.value)}
                        placeholder="Min. 6 tekens"
                        className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Bevestig wachtwoord</label>
                      <input
                        type="password"
                        value={ownConfirmPass}
                        onChange={e => setOwnConfirmPass(e.target.value)}
                        placeholder="Herhaal wachtwoord"
                        className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                      />
                    </div>
                  </div>
                  {ownPassError && <p className="text-[13px] text-[#EF4444]">{ownPassError}</p>}
                  {ownPassSuccess && <p className="text-[13px] text-[#16A34A]">Wachtwoord gewijzigd.</p>}
                  <button
                    type="submit"
                    disabled={ownPassSaving || !ownNewPass || !ownConfirmPass}
                    className="px-4 py-1.5 text-[15px] font-medium bg-[#0E2A3C] text-white rounded-md hover:bg-[#1a3f5c] disabled:opacity-50 transition-colors"
                  >
                    {ownPassSaving ? 'Wijzigen…' : 'Wachtwoord wijzigen'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanalen */}
      {activeTab === 'kanalen' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[15.5px] font-medium text-[#374151]">
              {kanalen.length} {kanalen.length === 1 ? 'kanaal' : 'kanalen'} geconfigureerd
            </p>
            <button
              onClick={() => { setNieuwOpen(o => !o); setNieuwError('') }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[15px] font-medium bg-[#0E2A3C] text-white rounded-md hover:bg-[#1a3f5c] transition-colors"
            >
              <Plus size={13} />
              Kanaal toevoegen
            </button>
          </div>

          {/* Nieuw kanaal form */}
          {nieuwOpen && (
            <form onSubmit={handleNieuwKanaal} className="bg-white rounded-lg border border-[#E5E7EB] px-4 py-4 space-y-3">
              <p className="text-[15.5px] font-semibold text-[#111827]">Nieuw kanaal</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Kanaalnaam</label>
                  <input
                    type="text"
                    required
                    value={nieuwForm.naam}
                    onChange={e => setNieuwForm(f => ({ ...f, naam: e.target.value }))}
                    placeholder="bijv. bol.com, Cdiscount"
                    className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#6B7280] font-medium block mb-1">Adapter</label>
                  <select
                    value={nieuwForm.type}
                    onChange={e => setNieuwForm(f => ({ ...f, type: e.target.value as KanaalType }))}
                    className="w-full px-2.5 py-1.5 text-[15px] border border-[#E5E7EB] rounded-md outline-none focus:border-[#E8A000] bg-white text-[#374151]"
                  >
                    <option value="mirakl">Mirakl</option>
                    <option value="woocommerce">WooCommerce</option>
                  </select>
                </div>
              </div>
              {nieuwError && <p className="text-[13px] text-[#EF4444]">{nieuwError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={nieuwSubmitting}
                  className="px-4 py-1.5 text-[15px] font-medium bg-[#E8A000] text-white rounded-md hover:bg-[#d49200] transition-colors disabled:opacity-50"
                >
                  {nieuwSubmitting ? 'Aanmaken…' : 'Aanmaken'}
                </button>
                <button
                  type="button"
                  onClick={() => { setNieuwOpen(false); setNieuwError('') }}
                  className="px-4 py-1.5 text-[15px] font-medium border border-[#E5E7EB] rounded-md text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </form>
          )}

          {kanalenLoading ? (
            <div className="bg-white rounded-lg border border-[#E5E7EB] px-4 py-6 text-center text-[15px] text-[#9CA3AF]">Laden…</div>
          ) : kanalen.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E5E7EB] px-4 py-8 text-center">
              <p className="text-[15.5px] text-[#9CA3AF]">Nog geen kanalen toegevoegd</p>
              <p className="text-[12px] text-[#C4C9D4] mt-1">Klik op &quot;Kanaal toevoegen&quot; om te beginnen</p>
            </div>
          ) : kanalen.map(row => (
            <KanaalCard
              key={row.kanaal}
              row={row}
              onSaved={loadKanalen}
              onDeleted={loadKanalen}
            />
          ))}
        </div>
      )}
    </div>
  )
}
