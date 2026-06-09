'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from './Sidebar'
import { MobileTopbar } from './MobileTopbar'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileTopbar onMenuClick={() => setSidebarOpen(true)} />
      <main className="md:ml-56 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
