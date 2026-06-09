'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  RefreshCw,
  BarChart2,
  Settings,
  Truck,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/lib/auth'

const NAV_ADMIN = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/producten', label: 'Producten & Voorraad', icon: Package },
  { href: '/synchronisatie', label: 'Synchronisatie', icon: RefreshCw },
  { href: '/rapportages', label: 'Rapportages', icon: BarChart2 },
  { href: '/instellingen', label: 'Instellingen', icon: Settings },
]

const NAV_EMPLOYEE = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/producten', label: 'Producten & Voorraad', icon: Package },
  { href: '/synchronisatie', label: 'Synchronisatie', icon: RefreshCw },
  { href: '/rapportages', label: 'Rapportages', icon: BarChart2 },
]

const NAV_FULFILLMENT = [
  { href: '/fulfillment', label: 'Mijn orders', icon: Truck },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navItems =
    user?.role === 'fulfillment'
      ? NAV_FULFILLMENT
      : user?.role === 'admin'
      ? NAV_ADMIN
      : NAV_EMPLOYEE

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-56 flex flex-col transition-transform duration-200',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: '#0c2332' }}
      >
        {/* Logo header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Logo width={32} height={23} />
            <span className="text-base font-semibold text-white tracking-tight">Order Hub</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-[#E8A000] text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={15} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Profile bar */}
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#E8A000] flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-bold text-white">{user?.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-white/50 truncate">
                {user ? ROLE_LABELS[user.role] : ''}
              </p>
            </div>
            <button
              onClick={logout}
              title="Uitloggen"
              className="p-1 rounded text-white/50 hover:text-white transition-colors flex-shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
