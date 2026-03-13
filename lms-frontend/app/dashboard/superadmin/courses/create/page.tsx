'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function SuperAdminCreateCoursePage() {
    const router = useRouter()
    const [form, setForm] = useState({ title: '', description: '', published: false })
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }
    }, [])

    const handleSubmit = async () => {
        if (!form.title) { setError('Title is required'); return }
        setSaving(true); setError('')
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            })
            if (!res.ok) { const e = await res.json(); setError(e.message || 'Error'); return }
            setSuccess(true)
            setTimeout(() => router.push('/dashboard/superadmin/courses'), 1500)
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Create Course" />
            <main className="page-content">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => router.push('/dashboard/superadmin/courses')}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">← Back</button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Create New Course</h1>
                        <p className="text-gray-400 text-sm">Add a new course to the platform</p>
                    </div>
                </div>

                {success ? (
                    <div className="glass-card p-8 text-center">
                        <div className="text-5xl mb-4">✅</div>
                        <h2 className="text-white font-bold text-xl mb-2">Course Created!</h2>
                        <p className="text-gray-400">Redirecting to courses list...</p>
                    </div>
                ) : (
                    <div className="glass-card p-8 max-w-2xl">
                        {error && (
                            <div className="p-3 rounded-xl mb-5 text-sm text-red-400"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>❌ {error}</div>
                        )}
                        <div className="space-y-5">
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Course Title *</label>
                                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. Python for Beginners" className="input-field text-lg" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Description</label>
                                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    rows={5} placeholder="Course description..." className="input-field resize-none" />
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setForm(p => ({ ...p, published: !p.published }))}
                                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.published ? 'bg-green-500' : 'bg-gray-700'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${form.published ? 'left-7' : 'left-1'}`} />
                                </button>
                                <span className="text-gray-300 text-sm">{form.published ? 'Publish immediately' : 'Save as Draft'}</span>
                            </div>
                            <button onClick={handleSubmit} disabled={saving}
                                className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50">
                                {saving ? 'Creating...' : '🚀 Create Course'}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
