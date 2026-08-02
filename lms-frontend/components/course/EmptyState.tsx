'use client'

interface EmptyStateProps {
    onClearFilters?: () => void
    hasFilters?: boolean
}

export default function EmptyState({ onClearFilters, hasFilters = true }: EmptyStateProps) {
    return (
        <div className="p-12 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm text-center max-w-md mx-auto my-12 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 text-indigo-600 mx-auto flex items-center justify-center text-4xl shadow-inner">
                🔍
            </div>

            <div className="space-y-1">
                <h3 className="text-xl font-black text-[var(--text-primary)]">No courses found</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    Try changing your filters or search keywords to explore more courses.
                </p>
            </div>

            {hasFilters && onClearFilters && (
                <button
                    onClick={onClearFilters}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all"
                >
                    Clear All Filters
                </button>
            )}
        </div>
    )
}
