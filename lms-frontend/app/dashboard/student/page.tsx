'use client'
import { useEffect, useState, useMemo } from 'react'
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

export default function StudentDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [skills, setSkills] = useState<any[]>([])
    const [activity, setActivity] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'courses' | 'quizzes' | 'contests' | 'coding'>('courses')
    
    const [details, setDetails] = useState<any>({
        coursesProgress: [],
        codingHistory: [],
        assignedQuizzes: [],
        assignedTests: [],
        openContests: []
    })
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
            fetch(`${apiBase}/student/dashboard-details`, { headers }).then(r => r.json())
        ]).then(([statsData, skillsData, activityData, detailsData]) => {
            if (statsData && !statsData.message) setStats(statsData)
            if (Array.isArray(skillsData)) setSkills(skillsData)
            if (Array.isArray(activityData)) setActivity(activityData)
            if (detailsData && !detailsData.message) setDetails(detailsData)
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
            
            <main className="page-content pt-24 pb-16">
                {/* Hero / Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                    <div className="lg:col-span-8 bg-[var(--accent)] text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-indigo-200">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                        <div className="relative z-10">
                            <p className="text-indigo-100 text-sm font-semibold mb-2 opacity-80 uppercase tracking-widest">Dashboard Overview</p>
                            <h2 className="text-4xl font-black mb-4">Hello, {user?.name?.split(' ')[0]}! 👋</h2>
                            <p className="text-indigo-100/80 max-w-md text-lg leading-relaxed mb-6">
                                You have <b>{details.coursesProgress.length}</b> active courses and a <b>{stats?.streak || 0} day</b> coding streak. Keep the momentum going!
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

                {/* Tab Navigation */}
                <div className="flex flex-wrap border-b border-white/10 pb-3 gap-6 mb-8 mt-4">
                    {[
                        { id: 'courses', label: '📚 My Courses', count: details.coursesProgress.length },
                        { id: 'quizzes', label: '📝 Quizzes & Tests', count: details.assignedQuizzes.length + details.assignedTests.length },
                        { id: 'contests', label: '🏆 Live Contests', count: details.openContests.length, badge: 'HOT' },
                        { id: 'coding', label: '💻 Coding History', count: details.codingHistory.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-2 text-base font-bold transition-all relative flex items-center gap-2 ${
                                activeTab === tab.id ? 'text-indigo-400 font-black' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                    activeTab === tab.id ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-gray-400'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                            {tab.badge && (
                                <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-md animate-pulse">
                                    {tab.badge}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Loading Skeleton fallback */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl" />)}
                    </div>
                ) : (
                    <>
                        {/* Tab 1: My Courses */}
                        {activeTab === 'courses' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                                {details.coursesProgress.length === 0 ? (
                                    <div className="md:col-span-2 text-center py-16 glass-card">
                                        <div className="text-5xl mb-4">📚</div>
                                        <h4 className="text-lg font-bold text-gray-300">No active course enrollments</h4>
                                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Explore our collection and enroll in a course to start learning!</p>
                                        <button
                                            onClick={() => router.push('/dashboard/student/courses')}
                                            className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg"
                                        >
                                            Browse Courses
                                        </button>
                                    </div>
                                ) : (
                                    details.coursesProgress.map((c: any) => {
                                        const getPctColor = (p: number) => {
                                            if (p >= 80) return 'from-emerald-500 to-teal-400';
                                            if (p >= 40) return 'from-indigo-500 to-blue-400';
                                            return 'from-amber-500 to-orange-400';
                                        };
                                        return (
                                            <div 
                                                key={c.id}
                                                className="group relative overflow-hidden glass-card p-6 border border-white/5 hover:border-white/10 transition-all duration-300 shadow-xl flex flex-col justify-between"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getPctColor(c.progressPercent)} flex items-center justify-center text-3xl shadow-lg flex-shrink-0`}>
                                                        📚
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{c.category || 'General'}</span>
                                                        <h4 className="text-lg font-extrabold text-white mt-2 truncate group-hover:text-indigo-300 transition-colors">{c.title}</h4>
                                                        <p className="text-xs text-gray-500 mt-1 font-medium">{c.completedLessons} of {c.totalLessons} lessons completed</p>
                                                    </div>
                                                </div>

                                                <div className="mt-6 space-y-3">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-400 font-semibold">Course Progress</span>
                                                        <span className="font-black text-white">{c.progressPercent}%</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full bg-gradient-to-r ${getPctColor(c.progressPercent)} rounded-full transition-all duration-500`}
                                                            style={{ width: `${c.progressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                                                    {c.nextLessonId ? (
                                                        <div className="min-w-0 flex-1 mr-3">
                                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Next up</span>
                                                            <p className="text-xs font-bold text-indigo-300 truncate mt-0.5">{c.nextLessonTitle}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">✓ Course Completed</span>
                                                    )}
                                                    <button
                                                        onClick={() => router.push(`/dashboard/student/courses/${c.courseId}/learn`)}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                                            c.progressPercent >= 100 
                                                            ? 'bg-white/5 text-white hover:bg-white/10' 
                                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                                                        }`}
                                                    >
                                                        {c.progressPercent >= 100 ? 'Review Course' : 'Resume Learning'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* Tab 2: Quizzes & Tests */}
                        {activeTab === 'quizzes' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div>
                                    <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                        Assigned Quizzes ({details.assignedQuizzes.length})
                                    </h4>
                                    {details.assignedQuizzes.length === 0 ? (
                                        <div className="glass-card p-8 text-center text-gray-500 italic text-sm">
                                            No active quizzes assigned to your enrolled courses at this moment.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {details.assignedQuizzes.map((q: any) => (
                                                <div key={q.id} className="glass-card p-5 border border-white/5 hover:border-white/10 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">Quiz</span>
                                                            {q.completed ? (
                                                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">Completed</span>
                                                            ) : (
                                                                <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">Assigned</span>
                                                            )}
                                                        </div>
                                                        <h5 className="font-extrabold text-white text-base leading-tight mb-1">{q.title}</h5>
                                                        <p className="text-xs text-gray-500 font-medium">Course: {q.courseTitle}</p>
                                                    </div>
                                                    
                                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                        <div className="flex gap-4 text-xs font-bold text-gray-400">
                                                            <span>⏱️ {q.timeLimitMinutes} Min</span>
                                                            <span>❓ {q.questionsCount} Qs</span>
                                                        </div>
                                                        <button
                                                            onClick={() => router.push(`/dashboard/student/courses/${q.courseId}/learn`)}
                                                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                                                q.completed 
                                                                ? 'bg-white/5 text-gray-300 hover:bg-white/10' 
                                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                                                            }`}
                                                        >
                                                            {q.completed ? 'Review Quiz' : 'Start Attempt'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
                                        Assigned Tests & Assessments ({details.assignedTests.length})
                                    </h4>
                                    {details.assignedTests.length === 0 ? (
                                        <div className="glass-card p-8 text-center text-gray-500 italic text-sm">
                                            No major examinations or tests assigned.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {details.assignedTests.map((t: any) => (
                                                <div key={t.id} className="glass-card p-5 border border-white/5 hover:border-white/10 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-wider">Examination</span>
                                                            {t.completed ? (
                                                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">Completed</span>
                                                            ) : (
                                                                <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">Action Required</span>
                                                            )}
                                                        </div>
                                                        <h5 className="font-extrabold text-white text-base leading-tight mb-1">{t.title}</h5>
                                                        <p className="text-xs text-gray-500 font-medium">Course: {t.courseTitle}</p>
                                                    </div>
                                                    
                                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                        <div className="flex gap-4 text-xs font-bold text-gray-400">
                                                            <span>⏱️ {t.timeLimitMinutes} Min</span>
                                                            <span>❓ {t.questionsCount} Qs</span>
                                                        </div>
                                                        <button
                                                            onClick={() => router.push(`/dashboard/student/courses/${t.courseId}/learn`)}
                                                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                                                t.completed 
                                                                ? 'bg-white/5 text-gray-300 hover:bg-white/10' 
                                                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
                                                            }`}
                                                        >
                                                            {t.completed ? 'Review Test' : 'Begin Exam'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Live Contests */}
                        {activeTab === 'contests' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                                {details.openContests.map((c: any) => (
                                    <div 
                                        key={c.id} 
                                        className="group relative overflow-hidden glass-card p-6 border border-white/5 hover:border-white/10 shadow-xl flex flex-col justify-between transition-all duration-300"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">LIVE COMPETITION</span>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                                    <span>{c.registeredCount} Active</span>
                                                </div>
                                            </div>
                                            
                                            <h4 className="text-xl font-extrabold text-white leading-tight mb-2 group-hover:text-indigo-300 transition-colors">{c.title}</h4>
                                            <p className="text-xs text-gray-405 font-medium leading-relaxed mb-6">{c.description}</p>
                                        </div>

                                        <div className="border-t border-white/5 pt-4">
                                            <div className="grid grid-cols-3 gap-2 text-center mb-5">
                                                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-gray-500 uppercase font-black">Duration</p>
                                                    <p className="text-sm font-black text-white mt-0.5">{c.durationMinutes} Min</p>
                                                </div>
                                                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-gray-500 uppercase font-black">Total Marks</p>
                                                    <p className="text-sm font-black text-white mt-0.5">{c.totalMarks} XP</p>
                                                </div>
                                                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-gray-500 uppercase font-black">Start Date</p>
                                                    <p className="text-xs font-bold text-white mt-1 truncate">
                                                        {new Date(c.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => alert(`Registration confirmed for ${c.title}! Verification complete.`)}
                                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all"
                                            >
                                                Register & Participate
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tab 4: Coding Practice History */}
                        {activeTab === 'coding' && (
                            <div className="glass-card p-8 animate-in fade-in duration-300">
                                <h4 className="text-base font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                    Developer timeline ({details.codingHistory.length} solved)
                                </h4>

                                {details.codingHistory.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 italic text-sm">
                                        No dynamic coding practices completed yet. Solve a programming lesson to see your timeline!
                                    </div>
                                ) : (
                                    <div className="relative border-l border-white/10 pl-6 ml-4 space-y-8">
                                        {details.codingHistory.map((item: any) => (
                                            <div key={item.id} className="relative group">
                                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-4 border-[#090d16] group-hover:bg-indigo-400 transition-all shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                                
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                    <div>
                                                        <div className="flex flex-wrap gap-2 items-center mb-1">
                                                            <h5 className="font-extrabold text-white text-base group-hover:text-indigo-300 transition-colors">{item.title}</h5>
                                                            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium">Course: {item.courseTitle}</p>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-right">
                                                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 font-mono">
                                                            {item.language}
                                                        </span>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                            item.difficulty === 'EASY' ? 'text-emerald-400 bg-emerald-500/10' :
                                                            item.difficulty === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10' :
                                                            'text-rose-400 bg-rose-500/10'
                                                        }`}>
                                                            {item.difficulty}
                                                        </span>
                                                        <div className="min-w-[80px] text-right">
                                                            <p className="text-xs font-black text-emerald-400">+{item.xp} XP</p>
                                                            <p className="text-[9px] text-gray-500 mt-0.5">
                                                                {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Heatmap & Skill Radar grids in two columns below tabs for massive layout enrichment */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black flex items-center gap-3">
                                <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                                Learning Activity
                            </h3>
                            <span className="text-xs text-gray-500 font-mono italic">Consistency is key</span>
                        </div>
                        <ActivityHeatmap data={activity} />
                    </div>

                    <div className="glass-card p-8">
                        <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                            <span className="w-2 h-6 bg-purple-500 rounded-full" />
                            Skill Proficiency
                        </h3>
                        <SkillRadar data={skills} />
                    </div>
                </div>

                <div className="mt-8">
                    <DailyStreakDisplay />
                </div>
            </main>
        </div>
    )
}
