'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { API_URL } from '@/lib/api'
import { readJson, apiErrorMessage } from '@/lib/http'
import { getRoleHomePath } from '@/lib/roleUtils'
import AuthLayout from '@/components/auth/AuthLayout'

export default function LoginPage() {
    const router = useRouter()
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: form.email.trim(), password: form.password }),
            })
            const data = await readJson(res)
            if (!res.ok || !data?.user) throw new Error(apiErrorMessage(res, data, 'Invalid email or password'))
            if (data.access_token) localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))
            router.replace(getRoleHomePath(data.user.role))
        } catch (err: any) {
            setError(err instanceof TypeError
                ? 'Unable to reach the server. Check your connection and try again.'
                : err.message)
            setLoading(false)
        }
    }

    return (
        <AuthLayout title="Welcome back" subtitle="Sign in to continue to your learning workspace.">
            <form onSubmit={handleSubmit} className="grid gap-5">
                <div className="auth-field">
                    <label htmlFor="login-email">Email address</label>
                    <div className="auth-input-wrap">
                        <Mail aria-hidden="true" />
                        <input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            className="auth-input"
                            placeholder="you@college.edu"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            required
                            autoFocus
                        />
                    </div>
                </div>

                <div className="auth-field">
                    <label htmlFor="login-password">Password</label>
                    <div className="auth-input-wrap">
                        <Lock aria-hidden="true" />
                        <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            className="auth-input"
                            style={{ paddingRight: 48 }}
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="auth-reveal"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="auth-error" role="alert">
                        <AlertCircle aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}

                <button type="submit" disabled={loading} className="auth-submit">
                    {loading ? <><Loader2 className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight /></>}
                </button>
            </form>

            <p className="auth-switch">
                New to Applied STEM Labs?
                <Link href="/signup">Create a student account</Link>
            </p>
        </AuthLayout>
    )
}
