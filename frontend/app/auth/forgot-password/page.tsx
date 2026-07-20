'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
            <CardTitle>Reset password</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    If that email exists, a reset link has been sent. Check your inbox.
                  </AlertDescription>
                </Alert>
                <a href="/auth/login" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Back to sign in
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
                <p className="text-sm text-muted-foreground">
                  Enter your admin email and we'll send you a reset link.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@thefamgroup.uk"
                    autoComplete="email"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
                <div className="text-center">
                  <a href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Back to sign in
                  </a>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          thefamgroup Admin · Family. Community. Care.
        </p>
      </div>
    </div>
  )
}
