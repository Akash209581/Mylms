'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'
import BadgeList from '@/components/student/BadgeList'

export default function StudentProfilePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [editing, setEditing] = useState(false)
    const [formData, setFormData] = useState<any>({})
    const [badges, setBadges] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        setUser(u)
        setFormData(u)

        const headers = getAuthHeaders()
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

        // Fetch latest profile and badges
        Promise.all([
            fetch(`${apiBase}/auth/me`, { headers }).then(r => r.json()),
            fetch(`${apiBase}/student/badges`, { headers }).then(r => r.json())
        ]).then(([userData, badgesData]) => {
            if (userData && !userData.message) {
                setUser(userData)
                setFormData(userData)
                localStorage.setItem('user', JSON.stringify(userData))
            }
            if (Array.isArray(badgesData)) {
                setBadges(badgesData.map((b: any) => b.badge))
            }
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage('')
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
            const res = await fetch(`${apiBase}/student/profile`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData),
            })
            const updated = await res.json()
            if (updated && !updated.message) {
                setUser(updated)
                localStorage.setItem('user', JSON.stringify(updated))
                setEditing(false)
                setMessage('✅ Profile updated successfully!')
                setTimeout(() => setMessage(''), 3000)
            }
        } catch { 
            setMessage('❌ Failed to update profile.')
        } finally {
            setSaving(false)
        }
    }

    const calculateCompletion = () => {
        if (!user) return 0
        const fields = ['bio', 'githubUrl', 'linkedInUrl', 'mobileNumber', 'branch', 'pursuingYear']
        const completed = fields.filter(f => user[f]).length
        return Math.round((completed / fields.length) * 100)
    }

    const completion = calculateCompletion()
    const initials = user?.name?.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2) || 'S'

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
            <Sidebar role="STUDENT" />
            <Navbar title="Student Profile" />
            
            <main className="page-content pt-24 pb-12">
                {/* Hero Section */}
                <div className="relative mb-8">
                    <div className="h-48 md:h-64 rounded-3xl bg-[var(--accent)] overflow-hidden shadow-xl relative">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
                    </div>

                    <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-10">
                        <div className="flex flex-col md:flex-row items-end gap-6">
                            <div className="relative group">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-[var(--bg-surface)] border-4 border-[var(--bg-base)] flex items-center justify-center text-5xl font-black text-white shadow-2xl overflow-hidden relative">
                                    {user?.profilePicture ? (
                                        <Image 
                                            src={user.profilePicture} 
                                            alt={user.name} 
                                            fill 
                                            className="object-cover" 
                                            priority 
                                        />
                                    ) : (
                                        <span className="bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center">
                                            {initials}
                                        </span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-xl border-4 border-[var(--bg-base)] flex items-center justify-center shadow-lg">
                                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                                </div>
                            </div>

                            <div className="flex-1 pb-4">
                                <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">{user?.name}</h1>
                                <div className="flex flex-wrap items-center gap-4 text-[var(--text-secondary)] font-medium">
                                    <span className="flex items-center gap-2">🎓 {user?.collegeName || 'Student'}</span>
                                    <span className="w-1.5 h-1.5 bg-[var(--border-strong)] rounded-full opacity-40" />
                                    <span className="flex items-center gap-2">📍 {user?.state || 'Earth'}</span>
                                    <span className="w-1.5 h-1.5 bg-[var(--border-strong)] rounded-full opacity-40" />
                                    <span className="px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] text-[10px] font-black uppercase tracking-widest border border-[var(--accent-soft)]">Pro Student</span>
                                </div>
                            </div>

                            <div className="pb-4">
                                {editing ? (
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleSave} 
                                            disabled={saving}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button 
                                            onClick={() => setEditing(false)} 
                                            className="px-6 py-3 bg-[var(--bg-raised)] text-[var(--text-primary)] font-bold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setEditing(true)} 
                                        className="px-8 py-3 bg-[var(--accent)] text-white font-bold rounded-2xl hover:scale-105 hover:shadow-2xl hover:shadow-[var(--accent)]/20 transition-all shadow-xl"
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-6 max-w-7xl mx-auto">
                    {/* Left Column: Info */}
                    <div className="lg:col-span-8 space-y-8">
                        {message && (
                            <div className={`p-4 rounded-2xl font-bold border transition-all animate-fade-in ${message.includes('✅') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {message}
                            </div>
                        )}

                        {/* Bio & Socials */}
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                                Professional Bio
                            </h3>
                            {editing ? (
                                <textarea
                                    className="input-field min-h-[120px]"
                                    placeholder="Write something about your learning journey..."
                                    value={formData.bio || ''}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                />
                            ) : (
                                <p className="text-[var(--text-secondary)] leading-relaxed text-lg">
                                    {user?.bio || "No bio added yet. Tell us about your passion for technology!"}
                                </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Connect with me</label>
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { label: 'GitHub', icon: '🔗', key: 'githubUrl', color: '#fff' },
                                            { label: 'LinkedIn', icon: '💼', key: 'linkedInUrl', color: '#0077b5' },
                                        ].map(social => (
                                            <div key={social.key} className="flex items-center gap-3">
                                                <span className="w-10 h-10 rounded-xl bg-[var(--bg-raised)] flex items-center justify-center border border-[var(--border)] shadow-inner">
                                                    {social.icon}
                                                </span>
                                                {editing ? (
                                                    <input
                                                        type="text"
                                                        placeholder={`${social.label} URL`}
                                                        className="input-field py-2"
                                                        value={formData[social.key] || ''}
                                                        onChange={e => setFormData({ ...formData, [social.key]: e.target.value })}
                                                    />
                                                ) : (
                                                    <a href={user?.[social.key] || '#'} target="_blank" className="text-indigo-500 hover:text-indigo-600 font-bold transition-colors">
                                                        {user?.[social.key] ? social.label : `Add ${social.label}`}
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Contact Info</label>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-xl bg-[var(--bg-raised)] flex items-center justify-center border border-[var(--border)] shadow-inner">📱</span>
                                            {editing ? (
                                                <input
                                                    type="text"
                                                    placeholder="Mobile Number"
                                                    className="input-field py-2"
                                                    value={formData.mobileNumber || ''}
                                                    onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                                                />
                                            ) : (
                                                <span className="text-[var(--text-primary)] font-medium">{user?.mobileNumber || 'Not provided'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Achievements */}
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                <span className="w-2 h-6 bg-amber-500 rounded-full" />
                                My Achievements
                            </h3>
                            <BadgeList badges={badges} />
                        </div>

                        {/* Academic Details */}
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                                Academic Details
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Branch', key: 'branch', placeholder: 'CSE' },
                                    { label: 'Year', key: 'pursuingYear', placeholder: '4', type: 'number' },
                                    { label: 'Semester', key: 'semester', placeholder: '8', type: 'number' },
                                    { label: 'Reg No', key: 'registrationNumber', placeholder: 'ID-123' },
                                ].map(detail => (
                                    <div key={detail.key}>
                                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">{detail.label}</p>
                                        {editing ? (
                                            <input
                                                type={detail.type || 'text'}
                                                className="input-field py-2 text-indigo-500 font-bold"
                                                value={formData[detail.key] || ''}
                                                onChange={e => setFormData({ ...formData, [detail.key]: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-lg font-bold text-[var(--text-primary)]">{user?.[detail.key] || '—'}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Profile Health */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="glass-card p-8 sticky top-28">
                            <div className="text-center mb-8">
                                <h3 className="text-lg font-black mb-2 uppercase tracking-wide">Profile Health</h3>
                                <p className="text-[var(--text-muted)] text-xs font-medium">Higher completion increases visibility</p>
                            </div>

                            <div className="relative w-48 h-48 mx-auto mb-8">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="80"
                                        fill="none"
                                        stroke="var(--bg-raised)"
                                        strokeWidth="12"
                                    />
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="80"
                                        fill="none"
                                        stroke="url(#gradient)"
                                        strokeWidth="12"
                                        strokeDasharray={502.4}
                                        strokeDashoffset={502.4 * (1 - completion / 100)}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000"
                                    />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black">{completion}%</span>
                                    <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tighter">Completed</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-bold text-[var(--text-secondary)] mb-4">Complete your profile to unlock more opportunities!</p>
                                <div className="p-4 bg-[var(--accent-soft)] rounded-2xl border border-[var(--accent-soft)]">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">🏆</span>
                                        <div>
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Current Rank</p>
                                            <p className="text-[var(--accent-text)] font-black">ByteXL Prodigy</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
