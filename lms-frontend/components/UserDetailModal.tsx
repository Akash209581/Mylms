import { useEffect } from 'react'

interface UserDetailModalProps {
    user: any
    onClose: () => void
    canDelete?: boolean
    onDelete?: (id: number) => void
}

export default function UserDetailModal({ user, onClose, canDelete = false, onDelete }: UserDetailModalProps) {
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}>
            <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
                                <p className="text-gray-400 text-sm">{user.email}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Role & Status */}
                    <div className="flex gap-3">
                        <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getRoleBadgeStyle(user.role)}`}>
                            {user.role}
                        </span>
                        <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusBadgeStyle(user.isActive ?? true)}`}>
                            {user.isActive ?? true ? '✓ Active' : '✕ Inactive'}
                        </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailItem 
                            icon="🎓" 
                            label="College/University" 
                            value={user.collegeName || 'Not Assigned'} 
                        />
                        <DetailItem 
                            icon="📅" 
                            label="Created Date" 
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
                        <DetailItem 
                            icon="🆔" 
                            label="User ID" 
                            value={`#${user.id}`} 
                        />
                        <DetailItem 
                            icon="📧" 
                            label="Email" 
                            value={user.email} 
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        User #{user.id} • Created {formatDate(user.createdAt)}
                    </div>
                    <div className="flex gap-3">
                        {canDelete && onDelete && (
                            <button
                                onClick={() => {
                                    if (confirm(`Delete user ${user.name}?`)) {
                                        onDelete(user.id)
                                        onClose()
                                    }
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                            >
                                🗑️ Delete User
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
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
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-white font-medium">{value}</div>
        </div>
    )
}
