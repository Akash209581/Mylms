'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

export default function LoginPage() {
    const router = useRouter()
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Login failed')
            localStorage.setItem('user', JSON.stringify(data.user))
            localStorage.setItem('access_token', data.access_token)
            const role = data.user.role
            if (role === 'STUDENT') router.push('/dashboard/student')
            else if (role === 'INSTRUCTOR') router.push('/dashboard/instructor')
            else if (role === 'ADMIN') router.push('/dashboard/admin')
            else if (role === 'SUPERADMIN') router.push('/dashboard/superadmin')
            else router.push('/dashboard/student')
        } catch (err: any) { setError(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)' }}
            className="flex items-center justify-center px-4">

            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #c7d2fe, transparent)' }} />
            <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #ddd6fe, transparent)' }} />

            <div className="relative z-10 w-full max-w-md">
                {/* Card */}
                <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid #e8eaf6' }}
                    className="p-10 animate-fade-in">

                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold mb-1" style={{ color: '#0f172a' }}>EduVerse</h1>
                        <p className="text-sm" style={{ color: '#64748b' }}>Sign in to continue learning</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Email Address</label>
                            <input type="email" className="input-field" placeholder="you@example.com"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Password</label>
                            <input type="password" className="input-field" placeholder="••••••••"
                                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </div>

                        {error && (
                            <div className="px-4 py-3 rounded-xl text-sm"
                                style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626' }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-60"
                            style={{ color: 'white' }}>
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center mt-6 text-sm" style={{ color: '#64748b' }}>
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="font-semibold" style={{ color: '#6366f1' }}>
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
