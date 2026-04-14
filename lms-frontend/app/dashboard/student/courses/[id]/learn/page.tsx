'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import LessonContentRenderer from '@/components/student/LessonContentRenderer'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Menu, X, BookOpen, Clock, Award } from 'lucide-react'

interface Lesson {
    id: number
    title: string
    description?: string
    videoUrl?: string
    contentUrl?: string
    duration?: number
    type: string
    published: boolean
    order: number
    content?: any
}

interface Chapter {
    id: number
    title: string
    order: number
    lessons: Lesson[]
}

interface Module {
    id: number
    title: string
    order: number
    chapters: Chapter[]
}

interface Course {
    id: number
    title: string
    description?: string
    thumbnail?: string
    instructor?: { name: string }
}

interface LearningPathData {
    course: Course
    isEnrolled: boolean
    completedLessonIds: number[]
    modules: Module[]
}

export default function LearningPathPage() {
    const router = useRouter()
    const params = useParams()
    const courseId = params?.id

    const [data, setData] = useState<LearningPathData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [completing, setCompleting] = useState<number | null>(null)

    // Flat list of lessons for navigation
    const flatLessons = useMemo(() => {
        if (!data?.modules) return []
        const lessons: (Lesson & { moduleTitle: string; chapterTitle: string })[] = []
        data.modules.forEach(m => {
            m.chapters.forEach(c => {
                c.lessons.forEach(l => {
                    lessons.push({ ...l, moduleTitle: m.title, chapterTitle: c.title })
                })
            })
        })
        return lessons
    }, [data])

    const currentLesson = flatLessons[currentLessonIndex]

    useEffect(() => {
        if (courseId) fetchLearningPath()
    }, [courseId])

    const fetchLearningPath = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/student/courses/${courseId}/learning-path`)
            setData(res.data)
            // Try to find the first uncompleted lesson
            const firstUncompleted = res.data.modules.flatMap((m: any) => m.chapters.flatMap((c: any) => c.lessons))
                .findIndex((l: any) => !res.data.completedLessonIds.includes(l.id))
            
            if (firstUncompleted !== -1) {
                setCurrentLessonIndex(firstUncompleted)
            }
        } catch (err: any) {
            console.error('Error fetching learning path:', err)
            setError(err.response?.data?.message || 'Failed to load learning path')
        } finally {
            setLoading(false)
        }
    }

    const handleComplete = async () => {
        if (!currentLesson || completing) return
        setCompleting(currentLesson.id)
        try {
            await api.post(`/student/lessons/${currentLesson.id}/complete`)
            setData(prev => {
                if (!prev) return prev
                if (prev.completedLessonIds.includes(currentLesson.id)) return prev
                return { ...prev, completedLessonIds: [...prev.completedLessonIds, currentLesson.id] }
            })
            // Auto advance if not last
            if (currentLessonIndex < flatLessons.length - 1) {
                setCurrentLessonIndex(prev => prev + 1)
            }
        } catch (err) {
            console.error('Error completing lesson:', err)
        } finally {
            setCompleting(null)
        }
    }

    if (loading) return (
        <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                <p className="text-indigo-400 font-medium animate-pulse text-lg">Preparing your classroom...</p>
            </div>
        </div>
    )

    if (error || !data) return (
        <div className="flex h-screen w-full items-center justify-center bg-[#0f172a] p-6 text-center">
            <div className="glass-card p-8 max-w-md">
                <div className="text-6xl mb-6">⚠️</div>
                <h2 className="text-2xl font-bold text-white mb-2">{error || 'Something went wrong'}</h2>
                <p className="text-gray-400 mb-6 font-medium">We couldn't load the learning path. Please make sure you are enrolled and try again.</p>
                <button onClick={() => router.back()} className="btn-primary w-full shadow-lg shadow-indigo-500/20">Go Back</button>
            </div>
        </div>
    )

    const progressPercent = Math.round((data.completedLessonIds.length / flatLessons.length) * 100)

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0a0c10]">
            {/* Sidebar Overlay for Mobile */}
            {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="fixed bottom-6 left-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all lg:hidden"
                >
                    <Menu size={28} />
                </button>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-full transform flex-col bg-[#0f172a] shadow-2xl transition-all duration-300 ease-in-out lg:relative lg:flex lg:w-80 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-20 items-center justify-between border-b border-white/5 px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30">
                            <BookOpen size={20} />
                        </div>
                        <h2 className="font-bold text-white tracking-tight">Curriculum</h2>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {/* Course Progress */}
                    <div className="mb-6 p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">Progress</span>
                            <span className="text-xs font-bold text-white">{progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>

                    {/* Lesson Tree */}
                    <div className="space-y-6">
                        {data.modules.map((m, mIdx) => (
                            <div key={m.id} className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{m.title}</span>
                                </div>
                                {m.chapters.map((c, cIdx) => (
                                    <div key={c.id} className="space-y-1">
                                        <p className="px-2 pb-1 text-xs font-semibold text-gray-400 opacity-60 uppercase tracking-wide">
                                            {c.title}
                                        </p>
                                        <div className="space-y-0.5">
                                            {c.lessons.map(l => {
                                                const idx = flatLessons.findIndex(fl => fl.id === l.id)
                                                const isActive = currentLessonIndex === idx
                                                const isCompleted = data.completedLessonIds.includes(l.id)
                                                return (
                                                    <button
                                                        key={l.id}
                                                        onClick={() => {
                                                            setCurrentLessonIndex(idx)
                                                            if (window.innerWidth < 1024) setIsSidebarOpen(false)
                                                        }}
                                                        className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 ${
                                                            isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                    >
                                                        <div className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : isCompleted ? 'text-emerald-500' : 'text-gray-600'}`}>
                                                            {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                        </div>
                                                        <span className={`line-clamp-2 flex-1 text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                                                            {l.title}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-black/10">
                    <button 
                      onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
                      className="flex w-full items-center justify-center gap-2 p-3 text-sm font-bold text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-xl"
                    >
                        <ChevronLeft size={16} />
                        Exit Focus Mode
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="relative flex flex-1 flex-col overflow-hidden bg-mesh">
                {/* Header */}
                <header className="flex h-20 items-center justify-between border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-3xl px-8 z-40">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-white lg:hidden">
                            <Menu size={24} />
                        </button>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold text-white line-clamp-1">{data.course.title}</h1>
                            <div className="flex items-center gap-4 mt-0.5">
                                <span className="text-xs font-semibold text-indigo-400">{currentLesson?.moduleTitle}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-600" />
                                <span className="text-xs font-medium text-gray-400">{currentLesson?.chapterTitle}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center gap-6 px-6 border-x border-white/5 h-10">
                             <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                                <Clock size={14} className="text-indigo-400" />
                                <span>{currentLesson?.duration || 0}m</span>
                             </div>
                             <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                                <Award size={14} className="text-amber-400" />
                                <span>10 XP</span>
                             </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Step</p>
                           <p className="text-sm font-black text-white leading-none">{currentLessonIndex + 1} / {flatLessons.length}</p>
                        </div>
                    </div>
                </header>

                {/* Lesson Explorer - Scrollable content but fixed container */}
                <div className="flex-1 overflow-y-auto px-6 py-10 lg:px-24 custom-scrollbar bg-[#0f172a]/20">
                    <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {currentLesson && (
                            <div key={currentLesson.id}>
                                <div className="mb-10">
                                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest mb-4">
                                        Active Topic
                                     </div>
                                     <h2 className="text-5xl font-black text-white tracking-tight leading-tight">{currentLesson.title}</h2>
                                     {currentLesson.description && (
                                         <p className="mt-4 text-xl text-gray-400 font-medium leading-relaxed max-w-2xl">{currentLesson.description}</p>
                                     )}
                                </div>
                                
                                <LessonContentRenderer content={currentLesson.content} />
                                
                                {/* Bottom Action Section */}
                                <div className="mt-16 pt-12 border-t border-white/5 pb-20">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                        <div className="text-center sm:text-left">
                                            <p className="text-sm font-bold text-gray-400 mb-1">Ready to proceed?</p>
                                            <p className="text-xs text-gray-500">Marking this lesson complete will earn you points</p>
                                        </div>
                                        <button 
                                          onClick={handleComplete}
                                          disabled={completing !== null || data.completedLessonIds.includes(currentLesson.id)}
                                          className={`group relative overflow-hidden px-10 py-5 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center gap-3 shadow-2xl ${
                                            data.completedLessonIds.includes(currentLesson.id) 
                                              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                                              : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/40'
                                          }`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                                            {data.completedLessonIds.includes(currentLesson.id) ? (
                                                <>
                                                 <CheckCircle2 size={24} />
                                                 Completed
                                                </>
                                            ) : completing === currentLesson.id ? (
                                                <>
                                                 <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                 Processing...
                                                </>
                                            ) : (
                                                <>
                                                 🚀 Mark Complete
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Navigation Bar */}
                <footer className="flex h-20 items-center justify-between border-t border-white/5 bg-[#0f172a]/80 backdrop-blur-3xl px-8 z-40">
                    <button 
                      onClick={() => setCurrentLessonIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentLessonIndex === 0}
                      className="group flex items-center gap-3 text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:bg-indigo-500 group-hover:text-white group-hover:ring-indigo-500 transition-all">
                           <ChevronLeft size={20} />
                        </div>
                        <span className="hidden sm:inline">Previous</span>
                    </button>

                    <div className="hidden md:flex gap-1">
                        {flatLessons.map((_, idx) => (
                            <div 
                              key={idx}
                              className={`h-1 rounded-full transition-all duration-300 ${
                                currentLessonIndex === idx ? 'w-8 bg-indigo-500' : 
                                data.completedLessonIds.includes(flatLessons[idx].id) ? 'w-4 bg-emerald-500/50' : 'w-4 bg-white/10'
                              }`} 
                            />
                        ))}
                    </div>

                    <button 
                      onClick={() => setCurrentLessonIndex(prev => Math.min(flatLessons.length - 1, prev + 1))}
                      disabled={currentLessonIndex === flatLessons.length - 1}
                      className="group flex items-center gap-3 text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:bg-indigo-500 group-hover:text-white group-hover:ring-indigo-500 transition-all">
                           <ChevronRight size={20} />
                        </div>
                    </button>
                </footer>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
                .animate-shimmer {
                    animation: shimmer 1s infinite;
                }
            `}</style>
        </div>
    )
}
