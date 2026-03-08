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
    const [lessonContent, setLessonContent] = useState<any>(null)
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

                // Grab the very first lesson's content if it exists
                const firstModule = course.modules?.[0]
                const firstLesson = firstModule?.lessons?.[0]

                if (!firstLesson) {
                    throw new Error('This course has no published content yet.')
                }

                if (isMounted) {
                    setLessonContent(firstLesson.content || { type: 'notebook', cells: [] })
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8">
            <div className="bg-white w-full max-w-6xl h-full rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up">

                {/* Modal Header */}
                <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📺</span>
                        <h2 className="font-bold text-slate-800 text-lg">Course Preview</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                        title="Close Preview (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-12">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            <p>Loading interactive content...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
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

                    {!loading && !error && lessonContent && (
                        <div className="max-w-4xl mx-auto w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
                            <LessonEditor
                                lessonId={0} // Dummy ID, it's read-only
                                initialContent={lessonContent}
                                onSave={async () => { }} // Dummy save, it's read-only
                                readOnly={true}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
