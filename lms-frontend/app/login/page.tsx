'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await fetch('http://localhost:3001/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Login failed')

            // Store user info for client-side use
            localStorage.setItem('user', JSON.stringify(data.user))

            // Redirect by role
            const role = data.user.role
            if (role === 'STUDENT') router.push('/dashboard/student')
            else if (role === 'INSTRUCTOR') router.push('/dashboard/instructor')
            else if (role === 'ADMIN') router.push('/dashboard/admin')
            else if (role === 'SUPERADMIN') router.push('/dashboard/superadmin')
            else router.push('/dashboard/student')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            {/* Animated background orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
                style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
                style={{ background: 'radial-gradient(circle, #a855f7, transparent)', animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl animate-float"
                style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                <div className="glass-card p-8 animate-slide-up">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold gradient-text mb-1">EduVerse</h1>
                        <p className="text-gray-400 text-sm">Sign in to continue learning</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>

                        {error && (
                            <div className="px-4 py-3 rounded-xl text-red-400 text-sm"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 text-base"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : null}
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="text-center mt-6">
                        <p className="text-gray-400 text-sm">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                                Create one free
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
