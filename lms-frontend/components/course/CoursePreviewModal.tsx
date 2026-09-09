'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import LessonContentRenderer from '@/components/student/LessonContentRenderer'
import PdfSlideViewer from '@/components/student/PdfSlideViewer'

// Dynamically import the LessonEditor as it uses browser APIs (Katex, TipTap, etc)
const LessonEditor = dynamic(() => import('@/components/editor/LessonEditor'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    ),
})

interface CoursePreviewModalProps {
    courseId: number | null
    isOpen: boolean
    onClose: () => void
}

const typeIcons: Record<string, string> = {
    'video': '🎥',
    'article': '📄',
    'pdf': '📑',
    'quiz': '📝',
    'test': '📝',
    'assessment': '🏆',
    'assignment': '📋',
    'programming': '💻',
    'coding': '💻',
}

export default function CoursePreviewModal({ courseId, isOpen, onClose }: CoursePreviewModalProps) {
    const [courseData, setCourseData] = useState<any | null>(null)
    const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null)
    const [lessonData, setLessonData] = useState<{ title: string; type: string; content: any; contentUrl?: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen || !courseId) return

        let isMounted = true

        const fetchCourseContent = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await api.get(`/courses/${courseId}`)
                const course = res.data
                if (!course) throw new Error('Course not found')

                // Find the first lesson in the course structure
                let firstLesson = null;
                if (course.modules) {
                    for (const module of course.modules) {
                        // Direct module lessons
                        if (module.lessons && module.lessons.length > 0) {
                            firstLesson = module.lessons[0];
                            break;
                        }
                        // Nested chapters
                        if (module.chapters) {
                            for (const chapter of module.chapters) {
                                if (chapter.lessons && chapter.lessons.length > 0) {
                                    firstLesson = chapter.lessons[0];
                                    break;
                                }
                            }
                        }
                        if (firstLesson) break;
                    }
                }

                if (!firstLesson) {
                    throw new Error('This course has no topics or content to preview yet.')
                }

                if (isMounted) {
                    setCourseData(course)
                    setSelectedLessonId(firstLesson.id)
                    setLessonData({
                        title: firstLesson.title,
                        type: firstLesson.type || (firstLesson.content?.isPdf ? 'pdf' : 'article'),
                        content: firstLesson.content || { type: 'notebook', cells: [] },
                        contentUrl: firstLesson.contentUrl
                    })
                }

            } catch (err: any) {
                console.error('Failed to load preview:', err)
                if (isMounted) {
                    setError(err.message || 'Failed to load course preview.')
                }
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchCourseContent()

        return () => { isMounted = false }
    }, [courseId, isOpen])

    const handleSelectLesson = (lesson: any) => {
        setSelectedLessonId(lesson.id)
        setLessonData({
            title: lesson.title,
            type: lesson.type || (lesson.content?.isPdf ? 'pdf' : 'article'),
            content: lesson.content || { type: 'notebook', cells: [] },
            contentUrl: lesson.contentUrl
        })
    }

    if (!isOpen) return null

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center modal-backdrop p-4 md:p-8 animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="bg-[var(--bg-surface)] w-full max-w-6xl h-full rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up border border-[var(--border-strong)]">

                {/* Modal Header */}
                <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--bg-raised)] shrink-0 sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📺</span>
                        <h2 className="font-bold text-[var(--text-primary)] text-lg">Course Preview</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Close Preview (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-hidden bg-gray-50/50 flex">
                    
                    {/* Left Sidebar: Collapsible Curriculum Accordion */}
                    {!loading && !error && courseData && (
                        <div className="w-80 border-r border-[var(--border)] bg-[var(--bg-surface)] flex-shrink-0 h-full overflow-y-auto p-4 space-y-4 hidden md:block">
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 px-2">Course Curriculum</h3>
                            <div className="space-y-3">
                                {courseData.modules?.map((module: any, moduleIndex: number) => {
                                    const hasChapters = module.chapters && module.chapters.length > 0;
                                    const hasDirectLessons = module.lessons && module.lessons.length > 0;
                                    
                                    return (
                                        <div key={module.id} className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-surface)] shadow-sm">
                                            {/* Module Header */}
                                            <div className="w-full p-3 bg-[var(--bg-raised)] flex flex-col justify-start">
                                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Module {moduleIndex + 1}</span>
                                                <h4 className="font-bold text-[var(--text-primary)] text-sm mt-0.5 line-clamp-2">{module.title}</h4>
                                            </div>
                                            
                                            {/* Chapters / Lessons List */}
                                            <div className="p-2 space-y-1.5 bg-[var(--bg-surface)] border-t border-[var(--border)]">
                                                {/* If direct lessons */}
                                                {hasDirectLessons && module.lessons.map((lesson: any, lessonIdx: number) => {
                                                    const isSelected = selectedLessonId === lesson.id;
                                                    return (
                                                        <button
                                                            key={lesson.id}
                                                            onClick={() => handleSelectLesson(lesson)}
                                                            className={`w-full text-left p-2 rounded-lg transition-all flex items-start gap-2 group ${
                                                                isSelected 
                                                                    ? 'bg-indigo-600 text-white shadow-sm font-semibold' 
                                                                    : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                            }`}
                                                        >
                                                            <span className="text-sm mt-0.5">{typeIcons[lesson.type] || (lesson.content?.isPdf ? '📑' : '📄')}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold truncate leading-snug">{lesson.title}</p>
                                                                <span className={`text-[9px] uppercase tracking-wider ${isSelected ? 'text-indigo-200' : 'text-[var(--text-secondary)]'}`}>
                                                                    {lesson.type || (lesson.content?.isPdf ? 'pdf' : 'article')}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                
                                                {/* If nested chapters */}
                                                {hasChapters && module.chapters.map((chapter: any, chapIdx: number) => (
                                                    <div key={chapter.id} className="space-y-1">
                                                        <div className="px-2 py-1 bg-[var(--bg-hover)] rounded-md border border-[var(--border)]">
                                                            <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase">Chapter {moduleIndex+1}.{chapIdx+1}: {chapter.title}</span>
                                                        </div>
                                                        <div className="pl-1.5 space-y-1 border-l border-[var(--border-strong)] ml-2">
                                                            {chapter.lessons?.map((lesson: any, lessonIdx: number) => {
                                                                const isSelected = selectedLessonId === lesson.id;
                                                                return (
                                                                    <button
                                                                        key={lesson.id}
                                                                        onClick={() => handleSelectLesson(lesson)}
                                                                        className={`w-full text-left p-2 rounded-lg transition-all flex items-start gap-2 group ${
                                                                            isSelected 
                                                                                ? 'bg-indigo-600 text-white shadow-sm font-semibold' 
                                                                                : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                                        }`}
                                                                    >
                                                                        <span className="text-sm mt-0.5">{typeIcons[lesson.type] || (lesson.content?.isPdf ? '📑' : '📄')}</span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-semibold truncate leading-snug">{lesson.title}</p>
                                                                            <span className={`text-[9px] uppercase tracking-wider ${isSelected ? 'text-indigo-200' : 'text-[var(--text-secondary)]'}`}>
                                                                                {lesson.type || (lesson.content?.isPdf ? 'pdf' : 'article')}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Right Main Panel: Scrollable Content Preview */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-6 md:p-12 min-h-full flex flex-col justify-start">
                            {loading && (
                                <div className="flex flex-col items-center justify-center flex-1 text-[var(--text-secondary)] gap-4 py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                                    <p>Loading interactive content...</p>
                                </div>
                            )}

                            {error && !loading && (
                                <div className="flex flex-col items-center justify-center flex-1 text-[var(--text-secondary)] gap-4 py-12">
                                    <span className="text-5xl">📭</span>
                                    <p className="text-lg font-medium">{error}</p>
                                    <button
                                        onClick={onClose}
                                        className="btn-secondary mt-2"
                                    >
                                        Close Preview
                                    </button>
                                </div>
                            )}

                            {!loading && !error && lessonData && (
                                <div className="max-w-4xl mx-auto w-full space-y-4">
                                    <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-6">
                                        <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-[var(--text-primary)]">{lessonData.title}</h3>
                                                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-1">{lessonData.type} Content</p>
                                            </div>
                                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/20">PREVIEW MODE</span>
                                        </div>
                                        
                                        <div className="min-h-[400px]">
                                            {(() => {
                                                const pdfUrl = lessonData.content?.pdfUrl || lessonData.content?.fileUrl || (lessonData.type === 'pdf' || lessonData.contentUrl?.endsWith('.pdf') ? lessonData.contentUrl : null);
                                                
                                                if (pdfUrl || lessonData.type === 'pdf' || lessonData.content?.isPdf) {
                                                    return (
                                                        <div className="w-full">
                                                            <PdfSlideViewer
                                                                pdfUrl={pdfUrl || ''}
                                                                title={lessonData.title}
                                                            />
                                                        </div>
                                                    );
                                                }

                                                if (
                                                    lessonData.content?.type === 'quiz-builder' || 
                                                    lessonData.content?.type === 'assignment-builder' || 
                                                    lessonData.content?.type === 'programming-builder' ||
                                                    ['quiz', 'test', 'assessment', 'assignment', 'programming', 'coding'].includes((lessonData.type || '').toLowerCase())
                                                ) {
                                                    return (
                                                        <div className="p-6 bg-slate-900/40 rounded-2xl border border-[var(--border)] shadow-inner">
                                                            <LessonContentRenderer content={lessonData.content} />
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <LessonEditor
                                                        lessonId={0}
                                                        initialContent={lessonData.content}
                                                        onSave={async () => { }}
                                                        readOnly={true}
                                                        isModal={true}
                                                        stickyTopOffsetPx={0}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
