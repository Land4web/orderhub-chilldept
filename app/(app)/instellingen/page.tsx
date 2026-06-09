'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getProfiles, updateUserRole, createUser, deleteUser } from '@/lib/actions/users'
import { ROLE_LABELS } from '@/lib/auth'
import { Users, Settings, Shield, Trash2, Plus } from 'lucide-react'
import type { Role } from '@/lib/auth'
import type { Profile } from '@/lib/actions/users'

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-[#0E2A3C] text-white',
  employee: 'bg-[#F9FAFB] text-[#6B7280]',
  fulfillment: 'bg-[#FFF7ED] text-[#D97706]',
}

const ALL_ROLES: Role[] = ['admin', 'employee', 'fulfillment']

const EMPTY_FORM = { email: '', password: '', name: '', initials: '', role: 'employee' as Role }

export default function InstellingenPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'gebruikers' | 'account' | 'kanalen'>('gebruikers')
  const [team, setTeam] = useState<Profile[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [addError, setAddError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function loadTeam() {
    setTeamLoading(true)
    getProfiles().then(profiles => {
      setTeam(profiles)
      setTeamLoading(false)
    })
  }

  useEffect(() => {
    if (user?.role !== 'admin') return
    loadTeam()
  }, [user?.role])

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
    if (!error) {
      setTeam(prev => prev.filter(m => m.id !== id))
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

          {/* Add user form */}
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
              {addError && (
                <p className="text-[13px] text-[#EF4444] mb-3">{addError}</p>
              )}
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

          {/* User list */}
          <div className="divide-y divide-[#F3F4F6]">
            {teamLoading ? (
              <div className="px-4 py-6 text-center text-[15px] text-[#9CA3AF]">Laden…</div>
            ) : team.length === 0 ? (
              <div className="px-4 py-6 text-center text-[15px] text-[#9CA3AF]">Geen gebruikers gevonden</div>
            ) : team.map(member => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3.5">
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
                    onClick={() => handleDelete(member.id, member.name)}
                    disabled={deletingId === member.id || member.id === user?.id}
                    title={member.id === user?.id ? 'Je kunt jezelf niet verwijderen' : 'Verwijderen'}
                    className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
            <div className="pt-3 border-t border-[#F3F4F6]">
              <p className="text-[12px] text-[#9CA3AF]">
                Profielbewerking en wachtwoordwijziging worden beschikbaar in een volgende fase.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kanalen */}
      {activeTab === 'kanalen' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#E5E7EB]">
            <Settings size={14} className="text-[#9CA3AF]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">Kanaalkoppelingen</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {[
              { naam: 'WooCommerce', beschrijving: 'REST API koppeling', status: 'actief' },
              { naam: 'bol.com', beschrijving: 'Retailer API v10', status: 'actief' },
              { naam: 'Obelink (Mirakl)', beschrijving: 'Mirakl Marketplace API', status: 'actief' },
              { naam: 'Home24 (Mirakl)', beschrijving: 'Mirakl Marketplace API', status: 'actief' },
              { naam: 'eBay', beschrijving: 'eBay Fulfillment API', status: 'fout' },
            ].map(kanaal => (
              <div key={kanaal.naam} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-[15.5px] font-medium text-[#111827]">{kanaal.naam}</p>
                  <p className="text-[12px] text-[#9CA3AF]">{kanaal.beschrijving}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
                  kanaal.status === 'actief' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FEF2F2] text-[#EF4444]'
                }`}>
                  {kanaal.status === 'actief' ? 'Actief' : 'Fout'}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3.5 border-t border-[#E5E7EB]">
            <p className="text-[12px] text-[#9CA3AF]">
              API-sleutels en configuratie worden beheerd in een volgende fase.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
