'use client'

import { Menu } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

interface MobileTopbarProps {
  onMenuClick: () => void
}

export function MobileTopbar({ onMenuClick }: MobileTopbarProps) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-20 h-14 bg-white border-b border-[#E5E7EB] flex items-center px-4 gap-3">
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <Logo width={28} height={20} />
        <span className="text-base font-semibold text-[#111827]">Order Hub</span>
      </div>
    </header>
  )
}
