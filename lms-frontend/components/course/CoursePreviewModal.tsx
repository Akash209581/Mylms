'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'

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

export default function CoursePreviewModal({ courseId, isOpen, onClose }: CoursePreviewModalProps) {
    const [lessonData, setLessonData] = useState<{ title: string; type: string; content: any } | null>(null)
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
                    setLessonData({
                        title: firstLesson.title,
                        type: firstLesson.type,
                        content: firstLesson.content || { type: 'notebook', cells: [] }
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
                <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--bg-raised)] shrink-0">
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
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-12">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            <p>Loading interactive content...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] gap-4">
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
                                    <LessonEditor
                                        lessonId={0}
                                        initialContent={lessonData.content}
                                        onSave={async () => { }}
                                        readOnly={true}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
