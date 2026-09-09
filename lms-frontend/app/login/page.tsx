'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, BookOpen, AlertCircle, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/api'

export default function LoginPage() {
    const router = useRouter()
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Warm up and prefetch dashboard client bundles
        router.prefetch('/dashboard/student')
        router.prefetch('/dashboard/instructor')
        router.prefetch('/dashboard/admin')
        router.prefetch('/dashboard/superadmin')
        router.prefetch('/dashboard/instructor/question-bank')
        router.prefetch('/dashboard/instructor/courses')
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
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
            const role = data.user.role
            if (role === 'STUDENT') router.push('/dashboard/student')
            else if (role === 'INSTRUCTOR') router.push('/dashboard/instructor')
            else if (role === 'ADMIN') router.push('/dashboard/admin')
            else if (role === 'SUPERADMIN') router.push('/dashboard/superadmin')
            else if (role === 'QUESTION_CREATOR') router.push('/dashboard/instructor/question-bank')
            else if (role === 'CONTENT_CREATOR') router.push('/dashboard/instructor/courses')
            else router.push('/dashboard/student')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-indigo-500 selection:text-white bg-[#f4f7fe] overflow-x-hidden">
            {/* Full Screen Ambient Reference Artwork Background */}
            <div 
                className="absolute inset-0 bg-no-repeat bg-cover bg-left sm:bg-center pointer-events-none opacity-95 transition-opacity duration-700"
                style={{
                    backgroundImage: "url('/auth-bg-art.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'left center'
                }}
            />

            {/* Soft Ambient Radial Glows */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

            {/* Main Split-Screen Container */}
            <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[580px]">
                
                {/* Left Side: Learn Today, Lead Tomorrow Brand Message */}
                <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between self-stretch py-4 sm:py-8 lg:py-12 pl-2 sm:pl-6 lg:pl-10">
                    <div className="max-w-md">
                        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight leading-[1.15]">
                            Learn Today,
                        </h1>
                        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#4F7CFF] tracking-tight leading-[1.15] mt-1">
                            Lead Tomorrow.
                        </h1>
                        <p className="text-[#64748b] text-sm sm:text-[15px] mt-4 font-normal leading-relaxed">
                            EduVerse is your space to learn,<br className="hidden sm:inline" /> grow, and achieve beyond limits.
                        </p>
                    </div>

                    {/* Spacer to let the 3D artwork in the background shine through */}
                    <div className="hidden lg:block h-64 xl:h-72 w-full pointer-events-none" />
                </div>

                {/* Right Side: Auth Card */}
                <div className="lg:col-span-6 xl:col-span-5 flex justify-center w-full">
                    <div className="w-full max-w-[420px] bg-white rounded-[32px] sm:rounded-[36px] p-8 sm:p-10 shadow-[0_20px_50px_rgba(79,70,229,0.07)] border border-slate-100/90 backdrop-blur-sm">
                        
                        {/* Top Logo Icon */}
                        <div className="text-center mb-7">
                            <div className="inline-flex items-center justify-center w-[60px] h-[60px] rounded-2xl mb-4 bg-gradient-to-tr from-[#6C63FF] to-[#4F7CFF] shadow-lg shadow-indigo-500/25 transition-transform duration-300 hover:scale-105">
                                <BookOpen className="w-7 h-7 text-white stroke-[2.2]" />
                            </div>
                            <h2 className="text-2xl sm:text-[27px] font-bold text-[#0f172a] tracking-tight">
                                Applied STEM Labs
                            </h2>
                            <p className="text-sm text-[#94a3b8] mt-1.5 font-normal">
                                Sign in to continue learning
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                                        <Mail className="w-4 h-4 stroke-[1.8]" />
                                    </div>
                                    <input
                                        type="email"
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal"
                                        placeholder="mallesh@gmail.com"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                                    Password
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                                        <Lock className="w-4 h-4 stroke-[1.8]" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4 stroke-[1.8]" />
                                        ) : (
                                            <Eye className="w-4 h-4 stroke-[1.8]" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs sm:text-sm animate-fade-in">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#7c5cf6] to-[#4F7CFF] hover:from-[#6d4be2] hover:to-[#3e68ea] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-[0_8px_20px_rgba(79,124,255,0.28)] hover:shadow-[0_10px_25px_rgba(79,124,255,0.38)] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer pt-3 mt-3"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Signing In...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        {/* Footer Switch */}
                        <p className="text-center mt-7 text-xs sm:text-sm text-slate-400 font-normal">
                            Don&apos;t have an account?{' '}
                            <Link
                                href="/signup"
                                className="font-semibold text-[#4F7CFF] hover:text-[#3e68ea] hover:underline transition-colors ml-1"
                            >
                                Create one free
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

