import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import { API_URL } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

interface UserEditModalProps {
    user: any
    onClose: () => void
    onSuccess: (updatedUser: any) => void
}

export default function UserEditModal({ user, onClose, onSuccess }: UserEditModalProps) {
    const [form, setForm] = useState({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'STUDENT',
        collegeName: user.collegeName || '',
        isActive: user.isActive ?? true,
        mobileNumber: user.mobileNumber || '',
        country: user.country || '',
        state: user.state || '',
        course: user.course || '',
        branch: user.branch || '',
        pursuingYear: user.pursuingYear ? String(user.pursuingYear) : '',
        semester: user.semester ? String(user.semester) : '',
        registrationNumber: user.registrationNumber || '',
        password: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [colleges, setColleges] = useState<any[]>([])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose])

    useEffect(() => {
        apiFetch(`${API_URL}/colleges`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setColleges(data)
            })
            .catch(() => {})
    }, [])

    const isGlobalRole = form.role === 'QUESTION_CREATOR' || form.role === 'CONTENT_CREATOR'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const payload: any = {
                name: form.name,
                email: form.email,
                role: form.role,
                isActive: form.isActive,
                collegeName: isGlobalRole ? null : form.collegeName,
            }

            if (form.password && form.password.trim().length >= 6) {
                payload.password = form.password.trim()
            }

            if (form.role === 'STUDENT') {
                payload.mobileNumber = form.mobileNumber
                payload.country = form.country
                payload.state = form.state
                payload.course = form.course
                payload.branch = form.branch
                payload.pursuingYear = form.pursuingYear ? parseInt(form.pursuingYear) : null
                payload.semester = form.semester ? parseInt(form.semester) : null
                payload.registrationNumber = form.registrationNumber
            }

            const res = await apiFetch(`${API_URL}/superadmin/users/${user.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.message || 'Failed to update user')
            }

            onSuccess(data.user || { ...user, ...payload })
            onClose()
        } catch (err: any) {
            setError(err.message || 'An error occurred while updating the user')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white animate-fade-in" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                            ✏️
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit User Profile</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Update account details, role permissions, or credentials</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-semibold">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                            <select
                                value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                            >
                                {['STUDENT', 'INSTRUCTOR', 'QUESTION_CREATOR', 'CONTENT_CREATOR', 'ADMIN', 'SUPERADMIN'].map(r => (
                                    <option key={r} value={r} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{r}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
                            <select
                                value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                                onChange={e => setForm({ ...form, isActive: e.target.value === 'ACTIVE' })}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                            >
                                <option value="ACTIVE" className="bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">✓ Active</option>
                                <option value="INACTIVE" className="bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400">✕ Inactive / Suspended</option>
                            </select>
                        </div>
                    </div>

                    {/* College Selection or Global Badge */}
                    {isGlobalRole ? (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                            <span className="text-xl">🌐</span>
                            <div>
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Global Platform Account</p>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-300/80">Creators operate across the entire platform and do not belong to any specific college.</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">College / University Name</label>
                            <input
                                type="text"
                                list="college-options"
                                value={form.collegeName}
                                onChange={e => setForm({ ...form, collegeName: e.target.value })}
                                placeholder="Select or enter college name..."
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <datalist id="college-options">
                                {colleges.map((c: any) => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>
                        </div>
                    )}

                    {/* Student Specific Fields */}
                    {form.role === 'STUDENT' && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                            <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                🎓 Student Academic Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Registration / Roll No.</label>
                                    <input
                                        type="text"
                                        value={form.registrationNumber}
                                        onChange={e => setForm({ ...form, registrationNumber: e.target.value })}
                                        placeholder="e.g. 231FA04867"
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Course / Degree</label>
                                    <input
                                        type="text"
                                        value={form.course}
                                        onChange={e => setForm({ ...form, course: e.target.value })}
                                        placeholder="e.g. B.Tech"
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Branch / Specialization</label>
                                    <input
                                        type="text"
                                        value={form.branch}
                                        onChange={e => setForm({ ...form, branch: e.target.value })}
                                        placeholder="e.g. CSE / IT"
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Mobile Number</label>
                                    <input
                                        type="text"
                                        value={form.mobileNumber}
                                        onChange={e => setForm({ ...form, mobileNumber: e.target.value })}
                                        placeholder="e.g. +91 9876543210"
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Year & Semester</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={form.pursuingYear}
                                            onChange={e => setForm({ ...form, pursuingYear: e.target.value })}
                                            placeholder="Year (1-4)"
                                            min={1}
                                            max={6}
                                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                        <input
                                            type="number"
                                            value={form.semester}
                                            onChange={e => setForm({ ...form, semester: e.target.value })}
                                            placeholder="Sem (1-8)"
                                            min={1}
                                            max={12}
                                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Country & State</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={form.country}
                                            onChange={e => setForm({ ...form, country: e.target.value })}
                                            placeholder="Country"
                                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                        <input
                                            type="text"
                                            value={form.state}
                                            onChange={e => setForm({ ...form, state: e.target.value })}
                                            placeholder="State"
                                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reset Password Option */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            🔑 Reset Password <span className="text-[10px] text-slate-500 font-normal">(Leave blank to keep unchanged)</span>
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder="Enter new password (min. 6 chars)..."
                            minLength={6}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
