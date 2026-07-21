'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token  = searchParams.get('token') ?? ''
  const invite = searchParams.get('invite') === '1'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(token, password, invite)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired reset link.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Invalid reset link. <a href="/auth/forgot-password" className="underline">Request a new one</a>.
        </AlertDescription>
      </Alert>
    )
  }

  return done ? (
    <div className="space-y-4">
      <Alert className="border-green-200 bg-green-50 text-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription>{invite ? 'Account activated! You can now sign in.' : 'Password updated. You can now sign in.'}</AlertDescription>
      </Alert>
      <a href="/auth/login" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        Go to sign in
      </a>
    </div>
  ) : (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Updating…' : 'Set new password'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="font-display text-2xl">
            the<span className="text-green-500">fam</span>group
          </span>
          <p className="mt-1 text-sm text-muted-foreground">Admin back-office</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set new password</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          thefamgroup Admin · Family. Community. Care.
        </p>
      </div>
    </div>
  )
}
