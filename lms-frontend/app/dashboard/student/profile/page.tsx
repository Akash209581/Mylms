'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function StudentProfilePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [editing, setEditing] = useState(false)
    const [name, setName] = useState('')
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        setUser(u)
        setName(u.name)
    }, [])

    const handleSave = async () => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name }),
            })
            const updated = { ...user, name }
            setUser(updated)
            localStorage.setItem('user', JSON.stringify(updated))
            setEditing(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch { }
    }

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="STUDENT" />
            <Navbar title="My Profile" />
            <main className="page-content">
                <div className="max-w-3xl mx-auto">
                    {/* Profile Card */}
                    <div className="glass-card p-8 mb-6 animate-slide-up">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-4xl font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                                    {initials || 'U'}
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>

                            <div className="flex-1 text-center sm:text-left">
                                {editing ? (
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="input-field text-xl font-bold mb-2"
                                    />
                                ) : (
                                    <h2 className="text-2xl font-bold text-white mb-1">{user?.name}</h2>
                                )}
                                <p className="text-gray-400 mb-3">{user?.email}</p>
                                <span className="badge badge-student">Student</span>
                            </div>

                            <div className="flex gap-3">
                                {editing ? (
                                    <>
                                        <button onClick={handleSave} className="btn-primary px-5 py-2 text-sm">Save</button>
                                        <button onClick={() => setEditing(false)} className="btn-secondary px-5 py-2 text-sm">Cancel</button>
                                    </>
                                ) : (
                                    <button onClick={() => setEditing(true)} className="btn-secondary px-5 py-2 text-sm flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>

                        {saved && (
                            <div className="mt-4 px-4 py-3 rounded-xl text-green-400 text-sm"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                ✅ Profile updated successfully!
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Enrolled', value: '3', icon: '📚', color: '#6366f1' },
                            { label: 'Completed', value: '1', icon: '✅', color: '#10b981' },
                            { label: 'Certificates', value: '2', icon: '🏆', color: '#f59e0b' },
                        ].map(s => (
                            <div key={s.label} className="glass-card p-5 text-center">
                                <div className="text-3xl mb-2">{s.icon}</div>
                                <p className="text-2xl font-bold text-white">{s.value}</p>
                                <p className="text-gray-400 text-sm">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Account Info */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Full Name', value: user?.name },
                                { label: 'Email', value: user?.email },
                                { label: 'Role', value: user?.role },
                                { label: 'Member Since', value: 'Feb 2024' },
                            ].map(item => (
                                <div key={item.label} className="flex justify-between py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                    <span className="text-gray-400 text-sm">{item.label}</span>
                                    <span className="text-white text-sm font-medium">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
