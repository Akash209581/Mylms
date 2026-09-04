'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import LessonContentRenderer from '@/components/student/LessonContentRenderer'
import PdfSlideViewer from '@/components/student/PdfSlideViewer'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Menu, X, BookOpen, Clock, Award, Download, Maximize2 } from 'lucide-react'

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
    chapterId: number
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
    const [pdfFullscreen, setPdfFullscreen] = useState(false)
    const [isPresentationMode, setIsPresentationMode] = useState(false)

    // Flat list of modules/lessons for sequential navigation
    const flatLessons = useMemo(() => {
        if (!data?.modules) return []
        const lessons: (Lesson & { moduleTitle: string; chapterTitle: string; chapterIndex: number; moduleIndex: number })[] = []
        
        data.modules.forEach((m, mIdx) => {
            m.chapters.forEach((c, cIdx) => {
                if (c.lessons && c.lessons.length > 0) {
                    c.lessons.forEach(l => {
                        lessons.push({
                            ...l,
                            moduleTitle: m.title,
                            chapterTitle: c.title,
                            chapterIndex: mIdx + 1,
                            moduleIndex: cIdx + 1,
                        })
                    })
                } else {
                    // Fallback if chapter has no direct lesson, create a virtual lesson for PDF module
                    lessons.push({
                        id: c.id,
                        title: c.title,
                        type: 'pdf',
                        published: true,
                        order: c.order,
                        chapterId: c.id,
                        moduleTitle: m.title,
                        chapterTitle: c.title,
                        chapterIndex: mIdx + 1,
                        moduleIndex: cIdx + 1,
                    })
                }
            })
        })
        return lessons
    }, [data])

    const currentLesson = flatLessons[currentLessonIndex]

    useEffect(() => {
        if (courseId) fetchLearningPath()
    }, [courseId])

    useEffect(() => {
        if (!data?.modules || flatLessons.length === 0) return

        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            const targetModId = urlParams.get('moduleId')
            const targetChId = urlParams.get('chapterId')
            const isStart = urlParams.get('start') === 'true' || urlParams.get('presentation') === 'true'

            if (isStart) {
                setIsPresentationMode(true)
            }

            if (targetModId) {
                const foundIdx = flatLessons.findIndex(l => String(l.chapterId) === targetModId || String(l.id) === targetModId)
                if (foundIdx !== -1) {
                    setCurrentLessonIndex(foundIdx)
                    return
                }
            } else if (targetChId) {
                const foundIdx = flatLessons.findIndex(l => {
                    const parentMod = data.modules.find(m => String(m.id) === targetChId)
                    return parentMod?.chapters?.some(c => c.id === l.chapterId)
                })
                if (foundIdx !== -1) {
                    setCurrentLessonIndex(foundIdx)
                    return
                }
            }
        }
    }, [data, flatLessons])

    const fetchLearningPath = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/student/courses/${courseId}/learning-path`)
            setData(res.data)
            
            // Default to first uncompleted lesson
            const firstUncompleted = res.data.modules.flatMap((m: any) => m.chapters.flatMap((c: any) => c.lessons || []))
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
            // Auto advance to next module or next chapter if available
            if (currentLessonIndex < flatLessons.length - 1) {
                setCurrentLessonIndex(prev => prev + 1)
            }
        } catch (err) {
            console.error('Error completing lesson:', err)
        } finally {
            setCompleting(null)
        }
    }

    // Determine whether next action is Next Module or Next Chapter
    const isLastModuleOfChapter = useMemo(() => {
        if (!currentLesson || currentLessonIndex >= flatLessons.length - 1) return true
        const nextLesson = flatLessons[currentLessonIndex + 1]
        return nextLesson.moduleTitle !== currentLesson.moduleTitle
    }, [currentLesson, currentLessonIndex, flatLessons])

    const nextNavLabel = useMemo(() => {
        if (currentLessonIndex >= flatLessons.length - 1) return 'Course Complete 🎉'
        const nextLesson = flatLessons[currentLessonIndex + 1]
        if (nextLesson.moduleTitle === currentLesson?.moduleTitle) {
            return `Next Module: ${nextLesson.chapterTitle || nextLesson.title}`
        }
        return `Next Chapter: ${nextLesson.moduleTitle}`
    }, [currentLesson, currentLessonIndex, flatLessons])

    // Get PDF Url for active module
    const activePdfUrl = useMemo(() => {
        if (!currentLesson) return null
        const contentPdf = currentLesson.content?.pdfUrl || currentLesson.content?.fileUrl
        if (contentPdf) return contentPdf
        if (currentLesson.contentUrl && (currentLesson.contentUrl.endsWith('.pdf') || currentLesson.type === 'pdf')) {
            return currentLesson.contentUrl
        }
        return null
    }, [currentLesson])

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
                <p className="text-gray-400 mb-6 font-medium">We couldn&apos;t load the learning path. Please make sure you are enrolled and try again.</p>
                <button onClick={() => router.back()} className="btn-primary w-full shadow-lg shadow-indigo-500/20">Go Back</button>
            </div>
        </div>
    )

    const progressPercent = flatLessons.length > 0 ? Math.round((data.completedLessonIds.length / flatLessons.length) * 100) : 0

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

            {/* Curriculum Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-full transform flex-col bg-[#0f172a] shadow-2xl transition-all duration-300 ease-in-out lg:relative lg:flex lg:w-80 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-20 items-center justify-between border-b border-white/5 px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30">
                            <BookOpen size={20} />
                        </div>
                        <h2 className="font-bold text-white tracking-tight">Course Outline</h2>
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

                    {/* Chapters & Modules Tree */}
                    <div className="space-y-6">
                        {data.modules.map((m, mIdx) => (
                            <div key={m.id} className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                                        Chapter {mIdx + 1}: {m.title}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {m.chapters.map((c, cIdx) => {
                                        const targetLesson = c.lessons?.[0] || { id: c.id }
                                        const idx = flatLessons.findIndex(fl => fl.chapterId === c.id || fl.id === targetLesson.id)
                                        const isActive = currentLessonIndex === idx
                                        const isCompleted = data.completedLessonIds.includes(targetLesson.id)

                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    if (idx !== -1) setCurrentLessonIndex(idx)
                                                    if (window.innerWidth < 1024) setIsSidebarOpen(false)
                                                }}
                                                className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 ${
                                                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                            >
                                                <div className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : isCompleted ? 'text-emerald-500' : 'text-gray-600'}`}>
                                                    {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`line-clamp-1 text-xs font-semibold ${isActive ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                        Module {mIdx + 1}.{cIdx + 1}
                                                    </p>
                                                    <p className={`line-clamp-1 text-sm ${isActive ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
                                                        {c.title}
                                                    </p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
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

            {/* Main Learning Content Area */}
            <main className="relative flex flex-1 flex-col overflow-hidden bg-mesh">
                {/* Header Bar */}
                <header className="flex h-20 items-center justify-between border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-3xl px-8 z-40">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-white lg:hidden">
                            <Menu size={24} />
                        </button>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold text-white line-clamp-1">{data.course.title}</h1>
                            <div className="flex items-center gap-4 mt-0.5">
                                <span className="text-xs font-semibold text-indigo-400">
                                    Chapter {currentLesson?.chapterIndex}: {currentLesson?.moduleTitle}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-gray-600" />
                                <span className="text-xs font-medium text-gray-300">
                                    Module {currentLesson?.chapterIndex}.{currentLesson?.moduleIndex}: {currentLesson?.chapterTitle}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center gap-6 px-6 border-x border-white/5 h-10">
                             <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                                <Clock size={14} className="text-indigo-400" />
                                <span>{currentLesson?.duration || 15}m</span>
                             </div>
                             <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                                <Award size={14} className="text-amber-400" />
                                <span>10 XP</span>
                             </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Module</p>
                           <p className="text-sm font-black text-white leading-none">{currentLessonIndex + 1} / {flatLessons.length}</p>
                        </div>
                    </div>
                </header>

                {/* Content View Container */}
                <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-16 custom-scrollbar bg-[#0f172a]/20">
                    <div className="mx-auto max-w-5xl animate-in fade-in duration-300">
                        {currentLesson && (
                            <div key={currentLesson.id}>
                                {/* Header section for current Module */}
                                <div className="mb-8">
                                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest mb-3">
                                        Chapter {currentLesson.chapterIndex} • Module {currentLesson.moduleIndex}
                                     </div>
                                     <h2 className="text-4xl font-black text-white tracking-tight leading-tight">{currentLesson.chapterTitle || currentLesson.title}</h2>
                                     {currentLesson.description && (
                                         <p className="mt-3 text-lg text-gray-400 font-medium leading-relaxed max-w-3xl">{currentLesson.description}</p>
                                     )}
                                </div>

                                {/* PDF Presentation Viewer or Rich Content Renderer */}
                                {activePdfUrl ? (
                                    <div className="w-full">
                                        <PdfSlideViewer
                                            pdfUrl={activePdfUrl}
                                            title={`${currentLesson.moduleTitle} • Module ${currentLesson.chapterIndex}.${currentLesson.moduleIndex}: ${currentLesson.chapterTitle || currentLesson.title}`}
                                            isCompleted={data.completedLessonIds.includes(currentLesson.id)}
                                            onModuleComplete={handleComplete}
                                            isLastModuleOfChapter={isLastModuleOfChapter}
                                            isPurePresentationMode={isPresentationMode}
                                            onExitPresentation={() => {
                                                setIsPresentationMode(false)
                                                router.push(`/dashboard/student/courses/${courseId}`)
                                            }}
                                            onNextModuleClick={() => {
                                                if (currentLessonIndex < flatLessons.length - 1) {
                                                    setCurrentLessonIndex(prev => prev + 1)
                                                }
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <LessonContentRenderer content={currentLesson.content || currentLesson.description} />
                                )}
                                
                                {/* Bottom Complete & Navigation Action Bar */}
                                <div className="mt-12 pt-8 border-t border-white/10 pb-16">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                        <div>
                                            <p className="text-sm font-bold text-white mb-1">
                                                {data.completedLessonIds.includes(currentLesson.id) 
                                                    ? '✨ Module Completed!' 
                                                    : 'Finished studying this module?'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Marking complete saves your progress across all chapters.
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                            <button 
                                              onClick={handleComplete}
                                              disabled={completing !== null}
                                              className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                                                data.completedLessonIds.includes(currentLesson.id) 
                                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/20'
                                              }`}
                                            >
                                                {data.completedLessonIds.includes(currentLesson.id) ? (
                                                    <>
                                                     <CheckCircle2 size={18} />
                                                     <span>Completed</span>
                                                    </>
                                                ) : completing === currentLesson.id ? (
                                                    <>
                                                     <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                     <span>Saving...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                     <span>✓ Mark Module Complete</span>
                                                    </>
                                                )}
                                            </button>

                                            {currentLessonIndex < flatLessons.length - 1 && (
                                                <button
                                                    onClick={() => setCurrentLessonIndex(prev => prev + 1)}
                                                    className="w-full sm:w-auto px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
                                                >
                                                    <span>{isLastModuleOfChapter ? '📂 Next Chapter →' : '📄 Next Module →'}</span>
                                                </button>
                                            )}
                                        </div>
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
                      className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:bg-indigo-500 group-hover:text-white group-hover:ring-indigo-500 transition-all">
                           <ChevronLeft size={20} />
                        </div>
                        <span className="hidden sm:inline">Previous</span>
                    </button>

                    <div className="hidden md:flex gap-1.5 items-center">
                        {flatLessons.map((l, idx) => (
                            <div 
                              key={idx}
                              onClick={() => setCurrentLessonIndex(idx)}
                              title={`${l.moduleTitle} - ${l.chapterTitle}`}
                              className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                                currentLessonIndex === idx ? 'w-8 bg-indigo-500' : 
                                data.completedLessonIds.includes(l.id) ? 'w-3 bg-emerald-500/60' : 'w-3 bg-white/10'
                              }`} 
                            />
                        ))}
                    </div>

                    <button 
                      onClick={() => setCurrentLessonIndex(prev => Math.min(flatLessons.length - 1, prev + 1))}
                      disabled={currentLessonIndex === flatLessons.length - 1}
                      className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                        <span className="hidden sm:inline">{nextNavLabel}</span>
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
            `}</style>
        </div>
    )
}
