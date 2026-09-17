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
                return 'bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/30'
            case 'ADMIN':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
            case 'INSTRUCTOR':
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30'
            case 'QUESTION_CREATOR':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30'
            case 'CONTENT_CREATOR':
                return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
            case 'STUDENT':
                return 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30'
            default:
                return 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border border-gray-500/30'
        }
    }

    const getStatusBadgeStyle = (isActive: boolean) => {
        return isActive
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30'
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
            <div 
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white animate-fade-in" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pb-6 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">{user.name}</h2>
                                    {user.role === 'QUESTION_CREATOR' || user.role === 'CONTENT_CREATOR' ? (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                                            🌐 Global Platform Staff
                                        </span>
                                    ) : null}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{user.email}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Role & Status */}
                    <div className="flex gap-2.5 mt-4">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${getRoleBadgeStyle(user.role)}`}>
                            {user.role}
                        </span>
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${getStatusBadgeStyle(user.isActive ?? true)}`}>
                            {user.isActive ?? true ? '✓ Active Account' : '✕ Suspended / Inactive'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="py-6 space-y-6">
                    {/* Role-Specific Stats: QUESTION_CREATOR */}
                    {user.role === 'QUESTION_CREATOR' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                📊 Question Authoring Activity
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-center">
                                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalQuestions ?? 0}</p>
                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-0.5">Total Created</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-center">
                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.approvedQuestions ?? 0}</p>
                                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mt-0.5">Approved</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-center">
                                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.pendingQuestions ?? 0}</p>
                                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mt-0.5">Pending</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center">
                                    <p className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.rejectedQuestions ?? 0}</p>
                                    <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-0.5">Rejected</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/20 text-center">
                                    <p className="text-xl font-black text-slate-700 dark:text-slate-400">{stats.deletedQuestions ?? 0}</p>
                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-0.5">Deleted</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Role-Specific Stats: CONTENT_CREATOR */}
                    {user.role === 'CONTENT_CREATOR' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                📚 Course & Content Authoring Activity
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-center">
                                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalCourses ?? 0}</p>
                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-0.5">Total Courses</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-center">
                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.approvedCourses ?? 0}</p>
                                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mt-0.5">Approved</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-center">
                                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.pendingCourses ?? 0}</p>
                                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mt-0.5">Pending</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-center">
                                    <p className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.rejectedCourses ?? 0}</p>
                                    <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider mt-0.5">Rejected</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Student Academic Details */}
                    {user.role === 'STUDENT' && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                            <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                🎓 Academic & Student Information
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Registration No</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{user.registrationNumber || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Course</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{user.course || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Branch</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{user.branch || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Year & Semester</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                        {user.pursuingYear ? `Year ${user.pursuingYear}` : '—'} {user.semester ? `(Sem ${user.semester})` : ''}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Mobile Number</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{user.mobileNumber || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Location</p>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
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
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        User ID: <span className="font-mono font-bold text-slate-900 dark:text-white">#{user.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                onClick={() => {
                                    onEdit(user)
                                    onClose()
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5"
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
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
                            >
                                🗑️ Delete
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border border-slate-200 dark:border-transparent transition-colors"
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
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{icon}</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-slate-900 dark:text-white text-xs font-bold truncate" title={value}>{value}</div>
        </div>
    )
}
