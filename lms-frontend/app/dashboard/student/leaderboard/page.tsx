'use client'
import { hasRole } from '@/lib/roleUtils'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { getAuthHeaders } from '@/lib/authHeaders'
import { EmptyState, PageHeader, initials } from '@/components/ui'
import { Globe2, Landmark, Medal, Trophy } from 'lucide-react'

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

const MEDALS = [
    { label: 'Gold', color: '#b88b43' },
    { label: 'Silver', color: '#8a8f99' },
    { label: 'Bronze', color: '#9c6b3f' },
]

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
        if (!hasRole(u, 'STUDENT')) { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setCurrentUser(u)
        fetchLeaderboard(u, filter)
    }, [])

    useEffect(() => {
        if (currentUser) fetchLeaderboard(currentUser, filter)
    }, [filter])

    const fetchLeaderboard = async (u: any, scope: string) => {
        setLoading(true)
        const headers = getAuthHeaders()
        const apiBase = API_URL
        try {
            const url = scope === 'college'
                ? `${apiBase}/student/leaderboard?scope=college`
                : `${apiBase}/student/leaderboard?scope=global`
            const res = await apiFetch(url, { headers })
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
        <div className="portal-page">
            <StudentReferenceShell active="leaderboard" />
            <main id="student-main" tabIndex={-1} className="portal-main">
                <PageHeader
                    eyebrow="Rankings"
                    title="Leaderboard"
                    description="Points are earned by completing lessons, keeping your streak and passing assessments."
                    actions={
                        <div className="ui-tabs" role="tablist" aria-label="Leaderboard scope">
                            {(['global', 'college'] as const).map(f => (
                                <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className="ui-tab">
                                    {f === 'global' ? <Globe2 className="w-4 h-4" aria-hidden="true" /> : <Landmark className="w-4 h-4" aria-hidden="true" />}
                                    {f === 'global' ? 'All colleges' : 'My college'}
                                </button>
                            ))}
                        </div>
                    }
                />

                {myRank && !loading && (
                    <section className="ui-card ui-card-pad ui-card-accent-gold mb-6 flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="grid place-items-center w-16 h-16 rounded-xl bg-[#1f3a5f] text-white shrink-0" style={{ boxShadow: 'inset 0 -3px 0 #9a7a43' }}>
                                <span className="font-display text-2xl font-semibold">#{myRank.rank}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--gold)]">Your position</p>
                                <p className="font-display text-xl font-semibold role-text-primary truncate">{myRank.name}</p>
                                <p className="text-sm role-text-muted truncate">{myRank.collegeName}</p>
                            </div>
                        </div>
                        <dl className="ui-kv md:w-[380px]">
                            <div><dt>Points</dt><dd>{myRank.points}</dd></div>
                            <div><dt>Streak</dt><dd>{myRank.streak} days</dd></div>
                            <div><dt>Badges</dt><dd>{myRank.badges}</dd></div>
                        </dl>
                    </section>
                )}

                {!loading && leaderboard.length >= 3 && (
                    <div className="grid grid-cols-3 gap-4 mb-8 items-end">
                        {[1, 0, 2].map((pos) => {
                            const entry = leaderboard[pos]
                            if (!entry) return null
                            const medal = MEDALS[pos]
                            return (
                                <div
                                    key={entry.userId}
                                    className={`ui-card ui-card-pad text-center ${pos === 0 ? 'pb-8' : ''}`}
                                    style={{ borderTop: `3px solid ${medal.color}`, outline: entry.isCurrentUser ? '2px solid var(--accent)' : undefined, outlineOffset: 2 }}
                                >
                                    <Medal className="mx-auto w-6 h-6" style={{ color: medal.color }} aria-label={`${medal.label} medal`} />
                                    <div className={`ui-avatar mx-auto mt-3 ${pos === 0 ? 'is-lg' : ''}`} style={{ background: medal.color, color: '#fff' }}>
                                        {initials(entry.name)}
                                    </div>
                                    <p className="font-semibold role-text-primary text-sm truncate mt-3">{entry.name}</p>
                                    <p className="text-xs role-text-muted truncate">{entry.collegeName}</p>
                                    <p className="font-display text-2xl font-semibold role-text-primary mt-2 ui-num">{entry.points}<span className="text-xs role-text-muted font-sans"> pts</span></p>
                                </div>
                            )
                        })}
                    </div>
                )}

                <section>
                    <div className="ui-section-head"><h2 className="ui-section-title">Full rankings</h2></div>
                    {loading ? (
                        <div className="grid gap-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="ui-skeleton h-14" />)}</div>
                    ) : leaderboard.length === 0 ? (
                        <EmptyState icon={Trophy} title="No rankings yet">Complete lessons and assessments to earn points and appear on the leaderboard.</EmptyState>
                    ) : (
                        <div className="ui-table-wrap">
                            <table className="ui-table">
                                <thead>
                                    <tr><th style={{ width: 72 }}>Rank</th><th>Student</th><th className="num hidden sm:table-cell">Streak</th><th className="num hidden md:table-cell">Badges</th><th className="num">Points</th></tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((entry) => (
                                        <tr key={entry.userId} style={entry.isCurrentUser ? { background: 'var(--accent-soft)' } : undefined}>
                                            <td>
                                                {entry.rank <= 3
                                                    ? <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: MEDALS[entry.rank - 1].color }}><Medal className="w-4 h-4" aria-hidden="true" />{entry.rank}</span>
                                                    : <span className="role-text-muted font-semibold ui-num">{entry.rank}</span>}
                                            </td>
                                            <td>
                                                <div className="ui-person">
                                                    <span className="ui-avatar">{initials(entry.name)}</span>
                                                    <div className="min-w-0">
                                                        <strong className="flex items-center gap-2">{entry.name}{entry.isCurrentUser && <span className="ui-badge is-accent no-dot">You</span>}</strong>
                                                        <small>{entry.collegeName || entry.email}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="num hidden sm:table-cell">{entry.streak || 0}d</td>
                                            <td className="num hidden md:table-cell">{entry.badges || 0}</td>
                                            <td className="num font-semibold">{entry.points || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}
