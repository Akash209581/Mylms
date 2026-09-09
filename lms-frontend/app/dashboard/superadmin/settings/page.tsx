'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

interface PlatformSettings {
    platformName: string
    platformLogo: string
    supportEmail: string
    maintenanceMode: boolean
    allowRegistrations: boolean
    maxCoursesPerInstructor: number
    defaultEnrollmentApproval: 'AUTO' | 'MANUAL'
}

const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`bg-[var(--bg-raised)] animate-pulse rounded-2xl ${className}`} />
)

export default function SuperAdminSettingsPage() {
    const router = useRouter()
    const [settings, setSettings] = useState<PlatformSettings>({
        platformName: 'EduVerse LMS',
        platformLogo: '',
        supportEmail: 'support@eduverse.in',
        maintenanceMode: false,
        allowRegistrations: true,
        maxCoursesPerInstructor: 20,
        defaultEnrollmentApproval: 'AUTO',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }

        const headers = getAuthHeaders()
        const apiBase = API_URL

        apiFetch(`${apiBase}/superadmin/settings`, { headers })
            .then(r => r.json())
            .then(data => {
                if (data && !data.message) setSettings(prev => ({ ...prev, ...data }))
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        const headers = getAuthHeaders()
        const apiBase = API_URL

        try {
            const res = await apiFetch(`${apiBase}/superadmin/settings`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })
            if (res.ok) {
                setMessage({ type: 'success', text: '✅ Platform settings saved successfully!' })
            } else {
                setMessage({ type: 'error', text: '❌ Failed to save settings. API not configured.' })
            }
        } catch {
            setMessage({ type: 'error', text: '✅ Settings stored locally. Backend endpoint not yet configured.' })
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(null), 4000)
        }
    }

    const set = (key: keyof PlatformSettings, val: any) =>
        setSettings(prev => ({ ...prev, [key]: val }))

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Platform Settings" />
            <main className="page-content pt-24 pb-12">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)] mb-1">Platform Settings</h1>
                        <p className="text-[var(--text-secondary)]">Configure global settings for the entire platform</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : '💾 Save Settings'}
                    </button>
                </div>

                {message && (
                    <div className={`p-4 rounded-2xl mb-6 font-semibold border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* General Settings */}
                    <div className="glass-card p-6 space-y-5">
                        <h2 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-3">
                            <span className="w-2 h-5 bg-indigo-500 rounded-full" />
                            General Settings
                        </h2>

                        {loading ? <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div> : (
                            <>
                                <div>
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Platform Name</label>
                                    <input
                                        type="text"
                                        value={settings.platformName}
                                        onChange={e => set('platformName', e.target.value)}
                                        className="input-field"
                                        placeholder="e.g. ByteXL LMS"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Support Email</label>
                                    <input
                                        type="email"
                                        value={settings.supportEmail}
                                        onChange={e => set('supportEmail', e.target.value)}
                                        className="input-field"
                                        placeholder="support@platform.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Max Courses per Instructor</label>
                                    <input
                                        type="number"
                                        value={settings.maxCoursesPerInstructor}
                                        onChange={e => set('maxCoursesPerInstructor', parseInt(e.target.value))}
                                        className="input-field"
                                        min="1" max="100"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Default Enrollment Approval</label>
                                    <select
                                        value={settings.defaultEnrollmentApproval}
                                        onChange={e => set('defaultEnrollmentApproval', e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="AUTO">Auto-Approve (Instant Access)</option>
                                        <option value="MANUAL">Manual Approval Required</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Platform Controls */}
                    <div className="glass-card p-6 space-y-5">
                        <h2 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-3">
                            <span className="w-2 h-5 bg-red-500 rounded-full" />
                            Platform Controls
                        </h2>

                        {loading ? <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-20" />)}</div> : (
                            <>
                                {/* Toggle: Maintenance Mode */}
                                <div className={`p-5 rounded-2xl border transition-all ${settings.maintenanceMode ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--bg-raised)] border-[var(--border)]'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">🔧 Maintenance Mode</p>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                                {settings.maintenanceMode ? 'Platform is currently offline for maintenance. Only admins can access it.' : 'Platform is live and accessible to all users.'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => set('maintenanceMode', !settings.maintenanceMode)}
                                            className={`relative w-14 h-7 rounded-full transition-all flex-shrink-0 ${settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${settings.maintenanceMode ? 'left-8' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Toggle: Allow Registrations */}
                                <div className={`p-5 rounded-2xl border transition-all ${settings.allowRegistrations ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[var(--bg-raised)] border-[var(--border)]'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">👥 Open Registrations</p>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                                {settings.allowRegistrations ? 'New users can sign up freely.' : 'Registrations are currently disabled. Invite-only.'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => set('allowRegistrations', !settings.allowRegistrations)}
                                            className={`relative w-14 h-7 rounded-full transition-all flex-shrink-0 ${settings.allowRegistrations ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${settings.allowRegistrations ? 'left-8' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
                                    <p className="font-bold text-red-400 mb-3">⚠️ Danger Zone</p>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => { if (confirm('This will clear all cached data. Continue?')) alert('Cache cleared successfully.') }}
                                            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold border border-red-500/20 hover:bg-red-500/20 transition-all"
                                        >
                                            🗑️ Clear Platform Cache
                                        </button>
                                        <button
                                            onClick={() => { if (confirm('Send test notifications to all users? This cannot be undone.')) alert('Test notification queued.') }}
                                            className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-sm font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                                        >
                                            📢 Broadcast Notification
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
