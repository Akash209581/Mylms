import { useEffect } from 'react'

interface UserDetailModalProps {
    user: any
    onClose: () => void
    canDelete?: boolean
    onDelete?: (id: number) => void
    onEdit?: (user: any) => void
}

export default function UserDetailModal({ user, onClose, canDelete = false, onDelete, onEdit }: UserDetailModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose])

    if (!user) return null

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'SUPERADMIN':
                return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-500/30'
            case 'ADMIN':
                return 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30'
            case 'INSTRUCTOR':
                return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-500/30'
            case 'QUESTION_CREATOR':
                return 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/30'
            case 'CONTENT_CREATOR':
                return 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-indigo-300 border border-indigo-500/30'
            case 'STUDENT':
                return 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30'
            default:
                return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
        }
    }

    const getStatusBadgeStyle = (isActive: boolean) => {
        return isActive
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
    }

    const formatDate = (date: string) => {
        if (!date) return 'N/A'
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const stats = user.stats || {}

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={onClose}>
            <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl text-white animate-fade-in" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="pb-6 border-b border-white/10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-white mb-0.5">{user.name}</h2>
                                    {user.role === 'QUESTION_CREATOR' || user.role === 'CONTENT_CREATOR' ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            🌐 Global Platform Staff
                                        </span>
                                    ) : null}
                                </div>
                                <p className="text-gray-400 text-xs">{user.email}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Role & Status */}
                    <div className="flex gap-2.5 mt-4">
                        <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${getRoleBadgeStyle(user.role)}`}>
                            {user.role}
                        </span>
                        <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${getStatusBadgeStyle(user.isActive ?? true)}`}>
                            {user.isActive ?? true ? '✓ Active Account' : '✕ Suspended / Inactive'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="py-6 space-y-6">
                    {/* Role-Specific Stats: QUESTION_CREATOR */}
                    {user.role === 'QUESTION_CREATOR' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                📊 Question Authoring Activity
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                                    <p className="text-lg font-black text-indigo-400">{stats.totalQuestions ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Total Created</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <p className="text-lg font-black text-emerald-400">{stats.approvedQuestions ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Approved</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                                    <p className="text-lg font-black text-amber-400">{stats.pendingQuestions ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Pending</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                                    <p className="text-lg font-black text-rose-400">{stats.rejectedQuestions ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider">Rejected</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-center">
                                    <p className="text-lg font-black text-slate-400">{stats.deletedQuestions ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Deleted</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Role-Specific Stats: CONTENT_CREATOR */}
                    {user.role === 'CONTENT_CREATOR' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                📚 Course & Content Authoring Activity
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                                    <p className="text-lg font-black text-indigo-400">{stats.totalCourses ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Total Courses</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <p className="text-lg font-black text-emerald-400">{stats.approvedCourses ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Approved</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                                    <p className="text-lg font-black text-amber-400">{stats.pendingCourses ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Pending</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                                    <p className="text-lg font-black text-rose-400">{stats.rejectedCourses ?? 0}</p>
                                    <p className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider">Rejected</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Student Academic Details */}
                    {user.role === 'STUDENT' && (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                🎓 Academic & Student Information
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Registration No</p>
                                    <p className="text-xs font-bold text-white mt-0.5">{user.registrationNumber || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Course</p>
                                    <p className="text-xs font-bold text-white mt-0.5">{user.course || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Branch</p>
                                    <p className="text-xs font-bold text-white mt-0.5">{user.branch || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Year & Semester</p>
                                    <p className="text-xs font-bold text-white mt-0.5">
                                        {user.pursuingYear ? `Year ${user.pursuingYear}` : '—'} {user.semester ? `(Sem ${user.semester})` : ''}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Mobile Number</p>
                                    <p className="text-xs font-bold text-white mt-0.5">{user.mobileNumber || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Location</p>
                                    <p className="text-xs font-bold text-white mt-0.5">
                                        {[user.state, user.country].filter(Boolean).join(', ') || 'Not provided'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Standard Account Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DetailItem 
                            icon="🎓" 
                            label="College / Organization" 
                            value={
                                user.role === 'QUESTION_CREATOR' || user.role === 'CONTENT_CREATOR'
                                    ? '🌐 Global Platform (All Colleges)'
                                    : user.collegeName || 'Not Assigned'
                            } 
                        />
                        <DetailItem 
                            icon="📅" 
                            label="Joined Date" 
                            value={formatDate(user.createdAt)} 
                        />
                        <DetailItem 
                            icon="🔄" 
                            label="Last Updated" 
                            value={formatDate(user.updatedAt)} 
                        />
                        <DetailItem 
                            icon="🕐" 
                            label="Last Login" 
                            value={user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'} 
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-xs text-slate-400">
                        User ID: <span className="font-mono text-white">#{user.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                onClick={() => {
                                    onEdit(user)
                                    onClose()
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-1.5"
                            >
                                ✏️ Edit Profile
                            </button>
                        )}
                        {canDelete && onDelete && (
                            <button
                                onClick={() => {
                                    if (confirm(`Are you sure you want to permanently delete user ${user.name}?`)) {
                                        onDelete(user.id)
                                        onClose()
                                    }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors flex items-center gap-1.5"
                            >
                                🗑️ Delete
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailItem({ icon, label, value }: { icon: string, label: string, value: string }) {
    return (
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{icon}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-white text-xs font-semibold truncate" title={value}>{value}</div>
        </div>
    )
}
