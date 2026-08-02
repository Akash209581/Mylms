'use client'

interface FilterPanelProps {
    filterTab: 'all' | 'enrolled' | 'available'
    setFilterTab: (tab: 'all' | 'enrolled' | 'available') => void
    category: string
    setCategory: (cat: string) => void
    level: string
    setLevel: (lvl: string) => void
    sortBy: string
    setSortBy: (sort: string) => void
    clearFilters: () => void
    enrolledCount: number
    categories: string[]
    levels: string[]
}

export default function FilterPanel({
    filterTab,
    setFilterTab,
    category,
    setCategory,
    level,
    setLevel,
    sortBy,
    setSortBy,
    clearFilters,
    enrolledCount,
    categories,
    levels
}: FilterPanelProps) {
    const hasActiveFilters = category || level || sortBy !== 'newest'

    return (
        <div className="space-y-4">
            {/* Top Bar: Enrollment Pill Tabs & Sort Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Pill Tab Buttons */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
                    {(['all', 'enrolled', 'available'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterTab(tab)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all capitalize ${
                                filterTab === tab
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                                    : 'text-gray-500 hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
                            }`}
                        >
                            {tab === 'all'
                                ? 'All Courses'
                                : tab === 'enrolled'
                                ? `My Enrolled (${enrolledCount})`
                                : 'Available'}
                        </button>
                    ))}
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs font-bold text-gray-400">Sort By:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] text-xs font-extrabold text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                    >
                        <option value="newest">Newest First</option>
                        <option value="popular">Most Popular</option>
                        <option value="rating">Highest Rated</option>
                        <option value="updated">Recently Updated</option>
                    </select>
                </div>
            </div>

            {/* Filter Controls Row */}
            <div className="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-center gap-3">
                {/* Category Dropdown */}
                <div className="flex-1 w-full">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-base)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Level Dropdown */}
                <div className="flex-1 w-full">
                    <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-base)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    >
                        <option value="">All Difficulty Levels</option>
                        {levels.map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                    </select>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2.5 rounded-2xl text-xs font-extrabold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-all self-stretch md:self-auto flex items-center justify-center gap-1.5"
                    >
                        <span>✕</span> Clear Filters
                    </button>
                )}
            </div>
        </div>
    )
}
