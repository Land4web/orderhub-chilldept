'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/lib/auth'
import { Users, Settings, Shield } from 'lucide-react'
import type { Role } from '@/lib/auth'

interface TeamMember {
  id: string
  name: string
  email: string
  initials: string
  role: Role
}

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-[#0E2A3C] text-white',
  employee: 'bg-[#F9FAFB] text-[#6B7280]',
  fulfillment: 'bg-[#FFF7ED] text-[#D97706]',
}

export default function InstellingenPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'gebruikers' | 'account' | 'kanalen'>('gebruikers')
  const [team, setTeam] = useState<TeamMember[]>([])

  useEffect(() => {
    if (user?.role !== 'admin') return
    supabase
      .from('profiles')
      .select('id, name, initials, role')
      .then(async ({ data }) => {
        if (!data) return
        const { data: authUsers } = await supabase.auth.admin
          ? // service role not available client-side — fall back to profiles only
          { data: null }
          : { data: null }
        // Map profiles (email not available client-side without service role)
        setTeam(data.map(p => ({
          id: p.id as string,
          name: p.name as string,
          initials: p.initials as string,
          role: p.role as Role,
          email: '—',
        })))
      })
  }, [user?.role])

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
            </div>
            <span className="text-[12px] text-[#9CA3AF]">{team.length} accounts</span>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {team.length === 0 ? (
              <div className="px-4 py-6 text-center text-[15px] text-[#9CA3AF]">Laden…</div>
            ) : team.map(member => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E8A000] flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-white">{member.initials}</span>
                  </div>
                  <div>
                    <p className="text-[15.5px] font-medium text-[#111827]">{member.name}</p>
                    <p className="text-[12px] text-[#9CA3AF]">{member.email}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${ROLE_BADGE[member.role]}`}>
                  {ROLE_LABELS[member.role]}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3.5 border-t border-[#E5E7EB]">
            <p className="text-[12px] text-[#9CA3AF]">
              Gebruikersbeheer (toevoegen, wijzigen, verwijderen) wordt beschikbaar in een volgende fase.
            </p>
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
