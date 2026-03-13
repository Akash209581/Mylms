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
        if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
        setLoading(true); setError('')
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Signup failed')
            setSuccess(true)
            setTimeout(() => router.push('/login'), 1500)
        } catch (err: any) { setError(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fdf4ff 0%, #f0f4ff 50%, #f0fdf4 100%)' }}
            className="flex items-center justify-center px-4">

            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #e9d5ff, transparent)' }} />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #c7d2fe, transparent)' }} />

            <div className="relative z-10 w-full max-w-md">
                <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid #ede9fe' }}
                    className="p-10 animate-fade-in">

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold mb-1" style={{ color: '#0f172a' }}>Join EduVerse</h1>
                        <p className="text-sm" style={{ color: '#64748b' }}>Start your learning journey today</p>
                    </div>

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="font-semibold text-lg" style={{ color: '#059669' }}>Account Created!</p>
                            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {[
                                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
                                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com' },
                                { key: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 characters' },
                                { key: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Repeat password' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>{f.label}</label>
                                    <input type={f.type} className="input-field" placeholder={f.placeholder}
                                        value={(form as any)[f.key]}
                                        onChange={e => setForm({ ...form, [f.key]: e.target.value })} required />
                                </div>
                            ))}

                            {error && (
                                <div className="px-4 py-3 rounded-xl text-sm"
                                    style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626' }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-60"
                                style={{ color: 'white', background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        Creating account...
                                    </span>
                                ) : 'Create Account'}
                            </button>
                        </form>
                    )}

                    <p className="text-center mt-6 text-sm" style={{ color: '#64748b' }}>
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold" style={{ color: '#6366f1' }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
