'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Lock, RefreshCw, FileText, Monitor, ArrowLeft, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/api'

export interface SlideData {
  slideNumber: number
  title?: string
  content?: string
  imageUrl?: string
}

interface SecurePPTViewerProps {
  title: string
  slides?: SlideData[]
  fileUrl?: string
  studentInfo?: {
    name?: string
    email?: string
    collegeName?: string
  }
  onClose?: () => void
}

export default function SecurePPTViewer({
  title,
  slides = [],
  fileUrl,
  studentInfo,
  onClose,
}: SecurePPTViewerProps) {
  const router = useRouter()
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isWindowBlurred, setIsWindowBlurred] = useState(false)
  const [timestamp, setTimestamp] = useState<string>('')
  const [viewMode, setViewMode] = useState<'document' | 'deck'>('deck')
  const containerRef = useRef<HTMLDivElement>(null)

  // PDF.js State & Refs
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [pdfNumPages, setPdfNumPages] = useState<number>(0)
  const [pdfLoading, setPdfLoading] = useState<boolean>(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)

  const fullFileUrl = fileUrl ? (fileUrl.startsWith('http') ? fileUrl : `${API_URL}${fileUrl}`) : null
  const isPdf = fullFileUrl ? (fullFileUrl.toLowerCase().endsWith('.pdf') || fullFileUrl.toLowerCase().includes('.pdf') || fullFileUrl.toLowerCase().includes('raw/upload') || fullFileUrl.toLowerCase().includes('pdf-courses')) : false
  const fileName = fileUrl ? fileUrl.split('/').pop() || 'Presentation File' : 'Presentation File'

  // Dynamic slide calculation: if PDF is loaded, use PDF page count
  const totalSlides = pdfNumPages > 0 ? pdfNumPages : (slides.length > 0 ? slides.length : 1)

  const slideList: SlideData[] = slides.length > 0 ? slides : [
    {
      slideNumber: 1,
      title: title,
      content: `Presentation: ${title}. Use the controls to view the uploaded presentation file.`,
    }
  ]

  const currentSlide = slideList[currentSlideIndex] || slideList[0]

  useEffect(() => {
    const updateTime = () => setTimestamp(new Date().toLocaleString())
    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [])

  // Load PDF.js library dynamically and fetch PDF document
  useEffect(() => {
    if (!isPdf || !fullFileUrl) return

    let isMounted = true
    setPdfLoading(true)
    setPdfError(null)

    const loadPdfjsAndDocument = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = () => {
              if ((window as any).pdfjsLib) {
                (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                resolve()
              } else {
                reject(new Error('PDF.js failed to load'))
              }
            }
            script.onerror = () => reject(new Error('Failed to load PDF script from CDN'))
            document.head.appendChild(script)
          })
        }

        const pdfjsLib = (window as any).pdfjsLib
        // Include auth token for backend-hosted PDFs (local disk fallback)
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const fetchHeaders: HeadersInit = {}
        if (token && fullFileUrl && !fullFileUrl.startsWith('https://res.cloudinary.com')) {
          fetchHeaders['Authorization'] = `Bearer ${token}`
        }

        let arrayBuffer: ArrayBuffer | null = null
        try {
          const response = await fetch(fullFileUrl, { headers: fetchHeaders })
          if (response.ok) {
            arrayBuffer = await response.arrayBuffer()
          }
        } catch (fetchErr) {
          console.warn('⚠️ Direct PDF fetch failed, attempting backend proxy...', fetchErr)
        }

        // If direct fetch did not succeed, fallback to backend PDF proxy
        if (!arrayBuffer && fullFileUrl) {
          try {
            const proxyUrl = `${API_URL}/courses/pdf-proxy?url=${encodeURIComponent(fullFileUrl)}`
            const proxyRes = await fetch(proxyUrl)
            if (proxyRes.ok) {
              arrayBuffer = await proxyRes.arrayBuffer()
            }
          } catch (proxyErr) {
            console.warn('⚠️ Backend PDF proxy fallback failed:', proxyErr)
          }
        }

        if (!arrayBuffer) {
          throw new Error('PDF document could not be loaded. Please re-upload or check network permissions.')
        }

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        if (isMounted) {
          setPdfDoc(pdf)
          setPdfNumPages(pdf.numPages)
          setPdfLoading(false)
        }
      } catch (err: any) {
        console.error('⚠️ PDF slide loading error:', err)
        if (isMounted) {
          setPdfError(err?.message || 'Failed to load PDF slides')
          setPdfLoading(false)
        }
      }
    }

    loadPdfjsAndDocument()

    return () => {
      isMounted = false
    }
  }, [isPdf, fullFileUrl])

  // Render current PDF page onto canvas
  const renderPdfPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || viewMode !== 'deck') return

    try {
      const pageNum = currentSlideIndex + 1
      const page = await pdfDoc.getPage(pageNum)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      // Cancel previous render task if active
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch (_) {}
      }

      const container = canvas.parentElement
      const containerWidth = container && container.clientWidth > 0 ? container.clientWidth - 16 : (window.innerWidth - 32)
      const containerHeight = container && container.clientHeight > 0 ? container.clientHeight - 16 : (window.innerHeight - 130)

      const unscaledViewport = page.getViewport({ scale: 1.0 })
      const scaleX = containerWidth / unscaledViewport.width
      const scaleY = containerHeight / unscaledViewport.height
      const scale = Math.min(scaleX, scaleY)

      const viewport = page.getViewport({ scale })
      const outputScale = window.devicePixelRatio || 1

      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined

      const renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport,
      }

      const task = page.render(renderContext)
      renderTaskRef.current = task
      await task.promise
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering PDF page:', err)
      }
    }
  }, [pdfDoc, currentSlideIndex, viewMode])

  useEffect(() => {
    if (pdfDoc && viewMode === 'deck') {
      renderPdfPage()
    }
  }, [pdfDoc, currentSlideIndex, viewMode, renderPdfPage])

  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc && viewMode === 'deck') {
        renderPdfPage()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pdfDoc, viewMode, renderPdfPage])

  const requestFullScreenMode = useCallback(() => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {})
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen()
      }
    }
  }, [])

  const exitFullScreenMode = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // DRM & Anti-Screenshot / Key Protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space' || e.key === 'PageDown') {
        e.preventDefault()
        handleNext()
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        handlePrev()
        return
      }

      const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen'
      const isCtrlP = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')
      const isCtrlS = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')
      const isDevTools = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')
      const isF12 = e.key === 'F12'
      const isMacScreenshot = (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))

      if (isPrintScreen || isCtrlP || isCtrlS || isDevTools || isF12 || isMacScreenshot) {
        e.preventDefault()
        e.stopPropagation()
        setIsWindowBlurred(true)
        setTimeout(() => setIsWindowBlurred(false), 3000)
        return false
      }
    }

    const handleWindowBlur = () => {
      setIsWindowBlurred(true)
    }

    const handleWindowFocus = () => {
      setIsWindowBlurred(false)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [currentSlideIndex, totalSlides])

  const handleNext = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1)
    }
  }

  const handleBack = () => {
    if (onClose) {
      onClose()
    } else {
      router.back()
    }
  }

  const watermarkText = `${studentInfo?.name || 'Authorized Learner'} • ${studentInfo?.email || ''} • ${studentInfo?.collegeName || 'LMS'} • ${timestamp}`

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between select-none overflow-hidden"
    >
      <style jsx global>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* Security Blur Overlay if Window Focus Lost */}
      {isWindowBlurred && (
        <div className="absolute inset-0 z-50 backdrop-blur-2xl bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/30 shadow-lg shadow-rose-500/20 animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Protected Content</h3>
          <p className="text-slate-300 max-w-md text-sm leading-relaxed mb-6">
            Screen capture and window focus switching are restricted to protect course material. Click below to resume viewing.
          </p>
          <button
            onClick={() => setIsWindowBlurred(false)}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Resume Presentation
          </button>
        </div>
      )}

      {/* Dynamic Watermark Tiled Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.05] overflow-hidden flex flex-wrap gap-12 p-8 select-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="text-[11px] font-bold tracking-widest text-slate-300 whitespace-nowrap -rotate-12 transform"
          >
            {watermarkText}
          </div>
        ))}
      </div>

      {/* Top Header Bar with BACK to Course button */}
      <header className="relative z-40 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between shadow-md select-none">
        <div className="flex items-center gap-3">
          {/* Button 1: BACK BUTTON */}
          <button
            onClick={handleBack}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white border border-indigo-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-md"
            title="Back to Course"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Course</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

          <div>
            <h2 className="text-sm font-bold text-white tracking-tight line-clamp-1">{title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-slate-800 text-indigo-300 px-3.5 py-1.5 rounded-full border border-slate-700 font-mono">
            Slide {currentSlideIndex + 1} of {totalSlides}
          </span>

          {fullFileUrl && (
            <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 hidden md:flex gap-1">
              <button
                onClick={() => setViewMode('deck')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'deck' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Slide Mode
              </button>
              <button
                onClick={() => setViewMode('document')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'document' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Full Document
              </button>
            </div>
          )}

          <button
            onClick={isFullscreen ? exitFullScreenMode : requestFullScreenMode}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Presentation Viewport - Fullscreen Canvas */}
      <main className="relative z-20 flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-slate-950">
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
          {viewMode === 'document' && fullFileUrl ? (
            <div className="w-full h-full flex flex-col bg-slate-950 p-2 items-center justify-center">
              {isPdf ? (
                <iframe src={fullFileUrl} className="w-full h-full border-0 rounded-2xl bg-white" title={title} />
              ) : (
                <div className="max-w-xl text-center space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-3xl mx-auto">
                    📊
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-xs text-indigo-300 font-mono bg-slate-950 px-3 py-1.5 rounded-xl inline-block border border-slate-800">
                      {fileName}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This presentation was uploaded as a file. Switch to Slide Mode to view interactively slide by slide.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setViewMode('deck')}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Monitor className="w-4 h-4" /> View Slide Deck
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Slide Deck View */
            <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
              {isPdf ? (
                pdfLoading ? (
                  <div className="flex flex-col items-center gap-3 text-indigo-400">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="text-xs font-bold tracking-wide">Loading PDF Slides...</p>
                  </div>
                ) : pdfError ? (
                  <div className="text-center p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-md">
                    <p className="text-rose-400 font-bold text-sm mb-2">Could not render PDF slides</p>
                    <p className="text-slate-400 text-xs mb-4">{pdfError}</p>
                    <button
                      onClick={() => setViewMode('document')}
                      className="px-4 py-2 bg-slate-800 text-white text-xs rounded-xl font-bold"
                    >
                      Open Full Document
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      className="max-h-full max-w-full object-contain rounded-xl shadow-2xl bg-white transition-all duration-150"
                    />
                  </div>
                )
              ) : currentSlide?.imageUrl ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={currentSlide.imageUrl}
                    alt={currentSlide.title || 'Slide image'}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="prose prose-invert max-w-4xl p-8 overflow-y-auto w-full h-full bg-slate-900/60 rounded-3xl border border-slate-800 flex items-center justify-center">
                  <p className="text-base md:text-xl text-slate-200 font-medium whitespace-pre-line leading-relaxed text-center">
                    {currentSlide?.content || 'No content available for this slide.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation Bar with PREVIOUS and NEXT buttons */}
      <footer className="relative z-40 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 select-none">
        {/* Button 2: PREVIOUS BUTTON */}
        <button
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 transition-all shadow-md ${
            currentSlideIndex === 0
              ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800/60'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Center Progress Bar */}
        <div className="hidden sm:flex flex-1 max-w-md items-center gap-3 px-4">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
              style={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap font-mono">
            {Math.round(((currentSlideIndex + 1) / totalSlides) * 100)}%
          </span>
        </div>

        {/* Button 3: NEXT BUTTON */}
        <button
          onClick={handleNext}
          disabled={currentSlideIndex === totalSlides - 1}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 transition-all shadow-md ${
            currentSlideIndex === totalSlides - 1
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/25 active:scale-95'
          }`}
        >
          {currentSlideIndex === totalSlides - 1 ? 'Completed' : 'Next'} <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  )
}
