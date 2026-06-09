'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/ui/Logo'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'fulfillment' ? '/fulfillment' : '/dashboard')
    }
  }, [user, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const ok = await login(email, password)
    if (!ok) {
      setError('Onjuist e-mailadres of wachtwoord.')
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ backgroundImage: "url('/login-bg.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(14,42,60,0.45)' }} />
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-white rounded-xl shadow-2xl px-9 py-10">
          <div className="mb-7">
            <Logo width={64} height={46} />
          </div>
          <h1 className="text-lg font-semibold text-[#111827] mb-1">Order Hub</h1>
          <p className="text-base text-gray-400 mb-6">Log in om verder te gaan</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-medium text-gray-600 mb-1.5">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="naam@chill-dept.nl"
                className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg outline-none focus:border-[#E8A000] transition-colors"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-medium text-gray-600 mb-1.5">Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-base border border-gray-200 rounded-lg outline-none focus:border-[#E8A000] transition-colors"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-[12.5px] text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg text-base font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: '#E8A000' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#d49200')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8A000')}
            >
              Inloggen
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-400">
            Demo accounts: maarten@chill-dept.nl / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
