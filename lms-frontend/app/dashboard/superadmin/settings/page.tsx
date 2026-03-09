'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function SuperAdminSettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState({
        siteName: 'National LMS Platform',
        maintenanceMode: false,
        allowRegistration: true,
        requireEmailVerification: false,
        sessionTimeout: 60, // minutes
        supportEmail: 'support@lms.gov.in'
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }
        // In a real app, fetch from backend. For now, simulate loading.
        setTimeout(() => setLoading(false), 500)
    }, [])

    const handleSave = () => {
        setSaving(true)
        // Simulate API call
        setTimeout(() => {
            setSaving(false)
            alert('Settings updated successfully (Simulated)')
        }, 1000)
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-mesh">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Platform Settings" />
            <main className="page-content">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-1">Global Configuration</h1>
                    <p className="text-gray-400">Manage platform-wide settings and system behavior</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                🖥️ General Settings
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Site Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={settings.siteName}
                                        onChange={e => setSettings({ ...settings, siteName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Support Email</label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        value={settings.supportEmail}
                                        onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Session Timeout (minutes)</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={settings.sessionTimeout}
                                        onChange={e => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                🛡️ Security & Registration
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium">Allow New Registrations</p>
                                        <p className="text-gray-500 text-xs">Enable/disable the signup page for new users</p>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, allowRegistration: !settings.allowRegistration })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.allowRegistration ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.allowRegistration ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium text-amber-500">Maintenance Mode</p>
                                        <p className="text-gray-500 text-xs">Lock the platform for everyone except Super Admins</p>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenanceMode ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium">Require Email Verification</p>
                                        <p className="text-gray-500 text-xs">New users must verify their email before logging in</p>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, requireEmailVerification: !settings.requireEmailVerification })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.requireEmailVerification ? 'bg-indigo-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.requireEmailVerification ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button className="px-6 py-2.5 rounded-xl text-sm font-medium btn-secondary">
                                Reset Changes
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Status info */}
                    <div className="space-y-6">
                        <div className="glass-card p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))' }}>
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">📊 System Health</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Database Connection</span>
                                        <span className="text-green-500">Stable</span>
                                    </div>
                                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[100%]" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">S3 Storage Capacity</span>
                                        <span className="text-gray-400">2.4 TB / 10 TB</span>
                                    </div>
                                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-[24%]" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Backup Status</span>
                                        <span className="text-gray-400">Last: 4h ago</span>
                                    </div>
                                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[100%]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-white font-semibold mb-3">🚀 Engine Version</h3>
                            <p className="text-gray-500 text-xs mb-4">Enterprise v2.4.0 (National Edition)</p>
                            <button className="w-full py-2 rounded-lg text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                Check for Updates
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
