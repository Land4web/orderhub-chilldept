'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Role } from '@/lib/auth'

export interface Profile {
  id: string
  name: string
  initials: string
  role: Role
  email: string
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, name, initials, role, email')
    .order('name')
  return (data ?? []).map(p => ({
    id: p.id as string,
    name: p.name as string,
    initials: p.initials as string,
    role: p.role as Role,
    email: (p.email as string) || '',
  }))
}

export async function updateUserRole(id: string, role: Role): Promise<void> {
  const supabase = await createClient()
  await supabase.from('profiles').update({ role }).eq('id', id)
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  initials: string,
  role: Role
): Promise<{ error?: string }> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return { error: error.message }
  const userId = data.user?.id
  if (!userId) return { error: 'Kon gebruiker niet aanmaken' }
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({ id: userId, name, initials, role, email })
  if (profileError) return { error: profileError.message }
  return {}
}

export async function deleteUser(id: string): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return { error: error.message }
  return {}
}
