'use client'
import { useEffect, useState, memo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'
import ActivityHeatmap from '@/components/student/ActivityHeatmap'

const SkillRadar = dynamic(() => import('@/components/student/SkillRadar'), {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center bg-[var(--bg-raised)] animate-pulse rounded-2xl" />
})

const DailyStreakDisplay = dynamic(() => import('@/components/student/DailyStreakDisplay'), {
    ssr: false,
    loading: () => <div className="h-32 bg-[var(--bg-raised)] animate-pulse rounded-2xl" />
})

// Skeleton loader component for consistent placeholder UI
const SkeletonCard = ({ className = '' }: { className?: string }) => (
    <div className={`bg-[var(--bg-raised)] animate-pulse rounded-2xl ${className}`} />
)

export default function StudentDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [skills, setSkills] = useState<any[]>([])
    const [activity, setActivity] = useState<any[]>([])
    const [enrollments, setEnrollments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'STUDENT') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        const headers = getAuthHeaders()
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

        Promise.all([
            fetch(`${apiBase}/student/stats`, { headers }).then(r => r.json()),
            fetch(`${apiBase}/student/skills`, { headers }).then(r => r.json()),
            fetch(`${apiBase}/student/activity`, { headers }).then(r => r.json()),
            fetch(`${apiBase}/enrollments/my`, { headers }).then(r => r.json())
        ]).then(([statsData, skillsData, activityData, enrollmentData]) => {
            if (statsData && !statsData.message) setStats(statsData)
            if (Array.isArray(skillsData)) setSkills(skillsData)
            if (Array.isArray(activityData)) setActivity(activityData)
            if (Array.isArray(enrollmentData)) setEnrollments(enrollmentData)
            setLoading(false)
        }).catch(err => {
            console.error('Failed to fetch dashboard data', err)
            setLoading(false)
        })
    }, [])

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
            <Sidebar role="STUDENT" />
            <Navbar title="Learning Dashboard" />
            
            <main className="page-content pt-24">
                {/* Hero / Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                    <div className="lg:col-span-8 bg-[var(--accent)] text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-indigo-200">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                        <div className="relative z-10">
                            <p className="text-indigo-100 text-sm font-semibold mb-2 opacity-80 uppercase tracking-widest">Dashboard Overview</p>
                            <h2 className="text-4xl font-black mb-4">Hello, {user?.name?.split(' ')[0]}! 👋</h2>
                            <p className="text-indigo-100/80 max-w-md text-lg leading-relaxed mb-6">
                                You have <b>{stats?.enrolledCourses || 0}</b> active courses and a <b>{stats?.streak || 0} day</b> coding streak. Keep the momentum going!
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button 
                                    onClick={() => router.push('/dashboard/student/courses')}
                                    className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all shadow-lg"
                                >
                                    Resume Learning
                                </button>
                                <button 
                                    onClick={() => router.push('/dashboard/student/profile')}
                                    className="px-6 py-3 bg-indigo-500/30 text-white font-bold rounded-xl border border-white/20 hover:bg-indigo-500/50 transition-all"
                                >
                                    View Profile
                                </button>
                            </div>
                        </div>
                        {/* College Logo Overlay */}
                        {user?.collegeLogo && (
                            <div className="absolute bottom-6 right-8 h-20 w-40 opacity-20 grayscale brightness-200 pointer-events-none">
                                <Image 
                                    src={user.collegeLogo} 
                                    alt="College Logo" 
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                        <div className="stat-card flex flex-col justify-center items-center text-center backdrop-blur-sm">
                            <div className="text-4xl mb-2">🔥</div>
                            <div className="text-2xl font-black">{stats?.streak || 0}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Current Streak</div>
                        </div>
                        <div className="stat-card flex flex-col justify-center items-center text-center backdrop-blur-sm">
                            <div className="text-4xl mb-2">💎</div>
                            <div className="text-2xl font-black">{stats?.points || 0}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">ByteXL Score</div>
                        </div>
                        <div className="stat-card flex flex-col justify-center items-center text-center backdrop-blur-sm">
                            <div className="text-4xl mb-2">🏆</div>
                            <div className="text-2xl font-black">{stats?.rank || '—'}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Global Rank</div>
                        </div>
                        <div className="stat-card flex flex-col justify-center items-center text-center">
                            <div className="text-4xl mb-2">🏅</div>
                            <div className="text-2xl font-black">{stats?.badges || 0}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Badges Won</div>
                        </div>
                    </div>
                </div>

                {/* Activity Heatmap */}
                <div className="glass-card p-8 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black flex items-center gap-3">
                            <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                            Learning Activity
                        </h3>
                        <span className="text-xs text-gray-500 font-mono italic">Consistency is key</span>
                    </div>
                    <ActivityHeatmap data={activity} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Skill Analysis */}
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                            <span className="w-2 h-6 bg-purple-500 rounded-full" />
                            Skill Proficiency
                        </h3>
                        <SkillRadar data={skills} />
                    </div>

                    {/* Courses & Streaks */}
                    <div className="space-y-6">
                        <DailyStreakDisplay />
                        
                        <div className="glass-card p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black flex items-center gap-3">
                                    <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                                    Current Courses
                                </h3>
                                <a href="/dashboard/student/courses" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View All</a>
                            </div>
                            
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl" />)}
                                </div>
                            ) : enrollments.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-3 opacity-20">📚</div>
                                    <p className="text-gray-500 text-sm italic">Not enrolled in any courses yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {enrollments.slice(0, 3).map((e: any) => (
                                        <div key={e.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] transition-all border border-transparent hover:border-[var(--border)] shadow-sm">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl shadow-lg">📚</div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-gray-200 truncate group-hover:text-white transition-colors">{e.course?.title}</h5>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="h-1.5 flex-1 bg-[var(--border)] rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full w-[45%] shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-500">45%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
