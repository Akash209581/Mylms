'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'

interface PdfSlideViewerProps {
    pdfUrl: string
    title?: string
    isCompleted?: boolean
    onModuleComplete?: () => void
    isLastModuleOfChapter?: boolean
    onNextModuleClick?: () => void
    isPurePresentationMode?: boolean
    onExitPresentation?: () => void
    initialPage?: number
    onPageChange?: (page: number) => void
}

declare global {
    interface Window {
        pdfjsLib?: any
    }
}

export default function PdfSlideViewer({
    pdfUrl,
    title,
    isCompleted = false,
    onModuleComplete,
    isLastModuleOfChapter = false,
    onNextModuleClick,
    isPurePresentationMode = false,
    onExitPresentation,
    initialPage = 1,
    onPageChange,
}: PdfSlideViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const renderTaskRef = useRef<any>(null)
    const renderSequence = useRef(0)

    const [pdfDoc, setPdfDoc] = useState<any>(null)
    const [numPages, setNumPages] = useState<number>(0)
    const [currentSlide, setCurrentSlide] = useState<number>(1)
    const [loading, setLoading] = useState<boolean>(true)
    const [rendering, setRendering] = useState<boolean>(false)
    const [error, setError] = useState<string>('')
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false)


    // Load PDF.js from CDN script if not present
    useEffect(() => {
        let isMounted = true

        const loadPdfJs = async () => {
            setLoading(true)
            setError('')

            try {
                if (!window.pdfjsLib) {
                    await new Promise<void>((resolve, reject) => {
                        const script = document.createElement('script')
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
                        script.onload = () => {
                            if (window.pdfjsLib) {
                                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                                resolve()
                            } else {
                                reject(new Error('PDF.js library failed to load.'))
                            }
                        }
                        script.onerror = () => reject(new Error('Failed to load PDF viewer scripts.'))
                        document.head.appendChild(script)
                    })
                } else if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                }

                if (!isMounted) return

                const loadingTask = window.pdfjsLib.getDocument({
                    url: pdfUrl,
                    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                    cMapPacked: true,
                })

                const doc = await loadingTask.promise
                if (!isMounted) return

                setPdfDoc(doc)
                setNumPages(doc.numPages)
                setCurrentSlide(Math.max(1, Math.min(doc.numPages, Math.floor(initialPage))))
                setLoading(false)
            } catch (err: any) {
                console.error('Failed to load PDF presentation:', err)
                if (isMounted) {
                    setError('Unable to render PDF presentation. Please verify file format.')
                    setLoading(false)
                }
            }
        }

        loadPdfJs()

        return () => {
            isMounted = false
        }
    }, [pdfUrl])

    useEffect(() => { if (!loading && pdfDoc) onPageChange?.(currentSlide) }, [currentSlide, loading, pdfDoc])

    // Render single slide onto HTML5 canvas
    const renderSlide = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current || !containerRef.current) return

        const sequence = ++renderSequence.current
        renderTaskRef.current?.cancel()
        setRendering(true)
        try {
            const page = await pdfDoc.getPage(currentSlide)
            if (sequence !== renderSequence.current) return
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Calculate scale to fit container width & height cleanly
            const containerWidth = containerRef.current.clientWidth - 32 // padding
            const containerHeight = containerRef.current.clientHeight - 100 // space for controls
            
            const unscaledViewport = page.getViewport({ scale: 1.0 })
            const widthScale = containerWidth / unscaledViewport.width
            const heightScale = containerHeight / unscaledViewport.height
            const targetScale = Math.min(widthScale, heightScale, 2.5) // limit max zoom to 2.5x

            const pixelRatio = window.devicePixelRatio || 1
            const viewport = page.getViewport({ scale: Math.max(targetScale, 0.1) })

            canvas.width = Math.floor(viewport.width * pixelRatio)
            canvas.height = Math.floor(viewport.height * pixelRatio)

            canvas.style.width = `${Math.floor(viewport.width)}px`
            canvas.style.height = `${Math.floor(viewport.height)}px`

            ctx.scale(pixelRatio, pixelRatio)

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
            }

            renderTaskRef.current = page.render(renderContext)
            await renderTaskRef.current.promise
        } catch (err) {
            console.error('Error rendering slide page:', err)
        } finally {
            if (sequence === renderSequence.current) setRendering(false)
        }
    }, [pdfDoc, currentSlide])

    useEffect(() => {
        renderSlide()

        const handleResize = () => renderSlide()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [renderSlide])

    // Navigation functions
    const goToPrevSlide = useCallback(() => {
        if (currentSlide > 1) {
            setCurrentSlide(prev => prev - 1)
        }
    }, [currentSlide])

    const goToNextSlide = useCallback(() => {
        if (currentSlide < numPages) {
            setCurrentSlide(prev => prev + 1)
        }
    }, [currentSlide, numPages])

    // Fullscreen API toggle
    const toggleFullscreen = () => {
        if (!containerRef.current) return
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.error(err))
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => console.error(err))
        }
    }

    // Auto trigger browser native Fullscreen API when presentation mode mounts
    useEffect(() => {
        if (isPurePresentationMode && containerRef.current) {
            const reqFs = () => {
                if (!document.fullscreenElement && containerRef.current) {
                    containerRef.current.requestFullscreen().catch(err => {
                        console.log('Browser fullscreen request failed or requires user gesture:', err)
                    })
                }
            }
            reqFs()
        }
    }, [isPurePresentationMode])

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement
            setIsFullscreen(isFs)
            // If user exits browser native full screen (e.g. via Esc key), return to normal course page
            if (!isFs && isPurePresentationMode && onExitPresentation) {
                onExitPresentation()
            }
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [isPurePresentationMode, onExitPresentation])

    // Keyboard Arrow Keys Navigation & Esc Exit
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
                e.preventDefault()
                goToNextSlide()
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault()
                goToPrevSlide()
            } else if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen()
            } else if (e.key === 'Escape' && onExitPresentation) {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {})
                }
                onExitPresentation()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [goToNextSlide, goToPrevSlide, onExitPresentation])

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center bg-slate-950 text-center p-8 ${isPurePresentationMode ? 'fixed inset-0 z-[100] h-screen w-screen' : 'h-[600px] w-full rounded-3xl border border-indigo-500/20 shadow-2xl'}`}>
                <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
                <p className="text-lg font-bold text-white tracking-wide">Loading Presentation Slides...</p>
                <p className="text-xs text-gray-400 mt-1">Preparing full-screen presentation deck for student</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center bg-slate-950 text-center p-8 ${isPurePresentationMode ? 'fixed inset-0 z-[100] h-screen w-screen' : 'h-[500px] w-full rounded-3xl border border-red-500/30'}`}>
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-white mb-2">{error}</h3>
                <p className="text-sm text-gray-400 mb-6">Could not load presentation slides from source URL.</p>
                {onExitPresentation && (
                    <button
                        onClick={onExitPresentation}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all"
                    >
                        Exit Presentation Mode
                    </button>
                )}
            </div>
        )
    }

    const isLastSlide = currentSlide === numPages

    return (
        <div
            ref={containerRef}
            className={`group relative flex flex-col items-center justify-between overflow-hidden bg-slate-950 text-white transition-all select-none ${
                isPurePresentationMode || isFullscreen
                    ? 'fixed inset-0 z-[9999] h-screen w-screen rounded-none'
                    : 'h-[min(720px,75dvh)] min-h-[360px] w-full rounded-3xl border border-indigo-500/30 shadow-2xl ring-1 ring-white/10'
            }`}
        >
            {/* Top Presentation Header Bar */}
            <div className="z-20 flex w-full items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 px-8 opacity-90 transition-opacity group-hover:opacity-100">
                <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30 text-xs font-black uppercase">
                        PPT
                    </span>
                    <h3 className="text-sm font-bold text-white truncate max-w-lg">
                        {title || 'Slide Presentation'}
                    </h3>
                </div>

                <div className="flex items-center gap-4"><button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'} className="rounded-lg p-2 hover:bg-white/10">{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
                    {/* Completion Status Badge */}
                    {isCompleted && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-in fade-in duration-300">
                            <CheckCircle2 size={14} />
                            <span>Module Completed</span>
                        </div>
                    )}

                    {/* Slide Counter */}
                    <div className="rounded-xl bg-white/10 px-3.5 py-1 text-xs font-black tracking-wider text-indigo-200 border border-white/10">
                        Slide {currentSlide} / {numPages}
                    </div>

                    {/* Press Esc to exit badge */}
                    {onExitPresentation && (
                        <button
                            onClick={() => {
                                if (document.fullscreenElement) {
                                    document.exitFullscreen().catch(() => {})
                                }
                                onExitPresentation()
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-red-500/30 text-gray-300 hover:text-white px-3 py-1.5 text-xs font-bold border border-white/10 transition-all"
                            title="Press Esc to exit Full-Screen Presentation Mode"
                        >
                            <span>Press <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/20 font-mono text-[10px]">Esc</kbd> to Exit</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Middle Slide Presentation Canvas Display */}
            <div className="relative flex flex-1 w-full items-center justify-center overflow-hidden p-4">
                {/* Left Floating Previous Slide Arrow Button */}
                <button
                    onClick={goToPrevSlide}
                    disabled={currentSlide === 1}
                    className={`absolute left-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all duration-200 shadow-2xl ${
                        currentSlide === 1
                            ? 'opacity-0 cursor-not-allowed pointer-events-none'
                            : 'opacity-40 hover:opacity-100 hover:scale-110 hover:bg-indigo-600 active:scale-95'
                    }`}
                    title="Previous Slide (←)"
                >
                    <ChevronLeft size={32} />
                </button>

                {/* Main Slide Canvas */}
                <div className="relative flex items-center justify-center shadow-2xl transition-all duration-300">
                    <canvas
                        ref={canvasRef}
                        className="max-h-full max-w-full rounded-xl object-contain bg-white shadow-2xl border border-white/5"
                    />

                    {rendering && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
                            <Loader2 size={32} className="animate-spin text-indigo-400" />
                        </div>
                    )}
                </div>

                {/* Right Floating Next Slide Arrow Button */}
                <button
                    onClick={goToNextSlide}
                    disabled={currentSlide === numPages}
                    className={`absolute right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all duration-200 shadow-2xl ${
                        currentSlide === numPages
                            ? 'opacity-0 cursor-not-allowed pointer-events-none'
                            : 'opacity-40 hover:opacity-100 hover:scale-110 hover:bg-indigo-600 active:scale-95'
                    }`}
                    title="Next Slide (→)"
                >
                    <ChevronRight size={32} />
                </button>
            </div>

            {/* Bottom Controls & Navigation Footer Bar */}
            <div className="z-20 flex w-full flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-4 px-6 border-t border-white/5">
                {/* Slide Step Progress Track */}
                <div className="flex items-center gap-1.5 flex-1 max-w-md">
                    {Array.from({ length: Math.min(numPages, 20) }).map((_, idx) => {
                        const pageNum = idx + 1
                        const active = pageNum === currentSlide
                        const passed = pageNum < currentSlide

                        return (
                            <button
                                key={pageNum}
                                onClick={() => setCurrentSlide(pageNum)}
                                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                                    active
                                        ? 'bg-indigo-500 ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/50'
                                        : passed
                                        ? 'bg-emerald-500/70'
                                        : 'bg-white/15 hover:bg-white/30'
                                }`}
                                title={`Jump to Slide ${pageNum}`}
                            />
                        )
                    })}
                </div>

                {/* Action Buttons: Next Slide or Next Module/Chapter */}
                <div className="flex items-center gap-3">
                    {isLastSlide ? (
                        <button
                            onClick={() => {
                                if (!isCompleted && onModuleComplete) onModuleComplete(); else if (onNextModuleClick) onNextModuleClick()
                            }}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 animate-pulse"
                        >
                            <span>{!isCompleted ? 'Mark complete & continue' : 'Continue'}</span>
                            <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={goToNextSlide}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            <span>Next Slide</span>
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
