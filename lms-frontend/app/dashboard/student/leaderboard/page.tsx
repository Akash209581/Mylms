'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

interface LeaderboardEntry {
    rank: number
    userId: number
    name: string
    email: string
    collegeName?: string
    points: number
    streak: number
    badges: number
    completedCourses: number
    isCurrentUser?: boolean
}

const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`bg-[var(--bg-raised)] animate-pulse rounded-2xl ${className}`} />
)

const medalColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600']
const medalBg = ['from-yellow-500/20 to-amber-500/20 border-yellow-500/30', 'from-gray-400/20 to-slate-400/20 border-gray-400/30', 'from-amber-600/20 to-amber-700/20 border-amber-600/30']

export default function StudentLeaderboardPage() {
    const router = useRouter()
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'global' | 'college'>('global')
    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'STUDENT') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setCurrentUser(u)
        fetchLeaderboard(u, filter)
    }, [])

    useEffect(() => {
        if (currentUser) fetchLeaderboard(currentUser, filter)
    }, [filter])

    const fetchLeaderboard = async (u: any, scope: string) => {
        setLoading(true)
        const headers = getAuthHeaders()
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        try {
            const url = scope === 'college'
                ? `${apiBase}/student/leaderboard?scope=college`
                : `${apiBase}/student/leaderboard?scope=global`
            const res = await fetch(url, { headers })
            const data = await res.json()
            if (Array.isArray(data)) {
                const ranked = data.map((entry: any, idx: number) => ({
                    ...entry,
                    rank: idx + 1,
                    isCurrentUser: entry.userId === u.id || entry.email === u.email,
                }))
                setLeaderboard(ranked)
                const mine = ranked.find((r: LeaderboardEntry) => r.isCurrentUser)
                if (mine) setMyRank(mine)
            }
        } catch {
            // API may not exist yet — show empty gracefully
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <Sidebar role="STUDENT" />
            <Navbar title="Leaderboard" />
            <main className="page-content pt-24 pb-12">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)] mb-1">🏆 Leaderboard</h1>
                        <p className="text-[var(--text-secondary)]">See where you stand against your peers</p>
                    </div>
                    {/* Filter Toggle */}
                    <div className="flex bg-[var(--bg-raised)] rounded-2xl p-1 border border-[var(--border)] gap-1">
                        {(['global', 'college'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    filter === f
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {f === 'global' ? '🌍 Global' : '🏫 My College'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* My rank banner */}
                {myRank && !loading && (
                    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                                #{myRank.rank}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Your Ranking</p>
                                <p className="font-black text-[var(--text-primary)] text-lg">{myRank.name}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{myRank.collegeName}</p>
                            </div>
                        </div>
                        <div className="flex gap-6 text-center">
                            {[
                                { label: 'Points', value: myRank.points, icon: '💎' },
                                { label: 'Streak', value: `${myRank.streak}d`, icon: '🔥' },
                                { label: 'Badges', value: myRank.badges, icon: '🏅' },
                            ].map(stat => (
                                <div key={stat.label}>
                                    <p className="text-lg font-black text-[var(--text-primary)]">{stat.icon} {stat.value}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top 3 Podium */}
                {!loading && leaderboard.length >= 3 && (
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {[1, 0, 2].map((pos) => {
                            const entry = leaderboard[pos]
                            if (!entry) return null
                            const isFirst = pos === 0
                            return (
                                <div
                                    key={entry.userId}
                                    className={`glass-card p-6 text-center border bg-gradient-to-b ${medalBg[pos]} ${entry.isCurrentUser ? 'ring-2 ring-indigo-500' : ''} ${isFirst ? 'order-2' : pos === 1 ? 'order-1 self-end' : 'order-3 self-end'}`}
                                >
                                    <div className={`text-4xl mb-2 ${isFirst ? 'text-5xl' : ''}`}>
                                        {pos === 0 ? '🥇' : pos === 1 ? '🥈' : '🥉'}
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white mx-auto mb-3 shadow-lg">
                                        {entry.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <p className="font-black text-[var(--text-primary)] text-sm truncate">{entry.name}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate mb-2">{entry.collegeName}</p>
                                    <p className={`text-xl font-black ${medalColors[pos]}`}>{entry.points} pts</p>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Full Rankings Table */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-black text-[var(--text-primary)] mb-5">Full Rankings</h2>

                    {loading ? (
                        <div className="space-y-3">
                            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16" />)}
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🏆</div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Leaderboard coming soon</h3>
                            <p className="text-[var(--text-secondary)]">Complete courses and earn points to appear here!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaderboard.map((entry) => (
                                <div
                                    key={entry.userId}
                                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                                        entry.isCurrentUser
                                            ? 'bg-indigo-500/10 border-2 border-indigo-500/30'
                                            : 'bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border)]'
                                    }`}
                                >
                                    {/* Rank */}
                                    <div className={`w-10 text-center font-black flex-shrink-0 ${
                                        entry.rank === 1 ? 'text-yellow-400 text-xl' :
                                        entry.rank === 2 ? 'text-gray-300 text-lg' :
                                        entry.rank === 3 ? 'text-amber-600 text-lg' :
                                        'text-[var(--text-muted)] text-sm'
                                    }`}>
                                        {entry.rank <= 3 ? (entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉') : `#${entry.rank}`}
                                    </div>

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black flex-shrink-0 shadow-sm">
                                        {entry.name?.charAt(0)?.toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-[var(--text-primary)] truncate">{entry.name}</p>
                                            {entry.isCurrentUser && (
                                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-full border border-indigo-500/30 flex-shrink-0">YOU</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] truncate">{entry.collegeName || entry.email}</p>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <div className="text-center hidden sm:block">
                                            <p className="font-black text-[var(--text-primary)]">🔥 {entry.streak || 0}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Streak</p>
                                        </div>
                                        <div className="text-center hidden md:block">
                                            <p className="font-black text-[var(--text-primary)]">🏅 {entry.badges || 0}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Badges</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-indigo-400">💎 {entry.points || 0}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Points</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
