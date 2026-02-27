'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
    const router = useRouter()
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match')
            return
        }
        setLoading(true)
        setError('')
        try {
            const res = await fetch('http://localhost:3001/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Signup failed')
            setSuccess(true)
            setTimeout(() => router.push('/login'), 1500)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
                style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
                style={{ background: 'radial-gradient(circle, #6366f1, transparent)', animationDelay: '1.5s' }} />
            <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl animate-float"
                style={{ background: 'radial-gradient(circle, #ec4899, transparent)', animationDelay: '2s' }} />

            <div className="relative z-10 w-full max-w-md px-4">
                <div className="glass-card p-8 animate-slide-up">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold gradient-text mb-1">Join EduVerse</h1>
                        <p className="text-gray-400 text-sm">Start your learning journey today</p>
                    </div>

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-green-400 font-semibold text-lg">Account Created!</p>
                            <p className="text-gray-400 text-sm mt-1">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="John Doe"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
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
                                    placeholder="Min. 6 characters"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder="Repeat password"
                                    value={form.confirmPassword}
                                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
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
                                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
                            >
                                {loading && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>
                    )}

                    <div className="text-center mt-6">
                        <p className="text-gray-400 text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
