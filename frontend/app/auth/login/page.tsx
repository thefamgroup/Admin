'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [show, setShow]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await login(email, password) }
    catch (err: any) { setError(err.message || 'Invalid credentials') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-[#22c55e] rounded-[8px] flex items-center justify-center text-white font-bold text-lg">F</div>
            <span className="font-display text-xl text-[#f0f0f0]">the<span className="text-[#22c55e]">fam</span>group</span>
          </div>
          <h1 className="font-display text-2xl text-[#f0f0f0] mb-1">Admin Sign In</h1>
          <p className="text-sm text-[#666]">Access the back-office dashboard</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          {error && (
            <div className="bg-[rgba(239,68,68,.1)] border border-[rgba(239,68,68,.2)] text-[#ef4444] text-sm px-4 py-2.5 rounded-[8px]">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">Email Address</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" placeholder="admin@thefamgroup.co.uk" autoComplete="email" required />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} value={password}
                onChange={e => setPass(e.target.value)}
                className="input pr-10" placeholder="••••••••" autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#a0a0a0]">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="btn btn-primary w-full justify-center py-2.5 text-sm disabled:opacity-60">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-[#444] mt-6">
          thefamgroup Admin · Family. Community. Care.
        </p>
      </div>
    </div>
  )
}
