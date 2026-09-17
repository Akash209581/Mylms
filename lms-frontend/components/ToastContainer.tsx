'use client'

import React, { useEffect, useState } from 'react'
import { toast, ToastItem } from '@/lib/toast'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    // Intercept native window.alert globally across the entire website
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert
      window.alert = (msg?: any) => {
        if (!msg && msg !== 0) return
        const str = typeof msg === 'object' ? JSON.stringify(msg) : String(msg)
        const lower = str.toLowerCase()
        if (lower.includes('error') || lower.includes('fail') || lower.includes('denied') || lower.includes('cannot') || lower.includes('invalid')) {
          toast.error(str)
        } else if (lower.includes('success') || lower.includes('saved') || lower.includes('created') || lower.includes('approved') || lower.includes('imported') || lower.includes('assigned')) {
          toast.success(str)
        } else if (lower.includes('warning') || lower.includes('please') || lower.includes('must') || lower.includes('require') || lower.includes('already')) {
          toast.warning(str)
        } else {
          toast.info(str)
        }
      }

      return () => {
        window.alert = originalAlert
      }
    }
  }, [])

  useEffect(() => {
    return toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast])
      if (newToast.duration !== 0) {
        setTimeout(() => {
          removeToast(newToast.id)
        }, newToast.duration || 4000)
      }
    })
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        let borderClass = 'border-slate-700/60 bg-slate-900/95 text-slate-100 shadow-slate-950/40'
        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />
        let badge = 'bg-blue-500/20 text-blue-300'

        if (t.type === 'success') {
          borderClass = 'border-emerald-500/30 bg-slate-950/95 text-emerald-100 shadow-emerald-950/20'
          icon = <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          badge = 'bg-emerald-500/20 text-emerald-300'
        } else if (t.type === 'error') {
          borderClass = 'border-rose-500/30 bg-slate-950/95 text-rose-100 shadow-rose-950/20'
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          badge = 'bg-rose-500/20 text-rose-300'
        } else if (t.type === 'warning') {
          borderClass = 'border-amber-500/30 bg-slate-950/95 text-amber-100 shadow-amber-950/20'
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          badge = 'bg-amber-500/20 text-amber-300'
        } else if (t.type === 'info') {
          borderClass = 'border-blue-500/30 bg-slate-950/95 text-blue-100 shadow-blue-950/20'
          icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />
          badge = 'bg-blue-500/20 text-blue-300'
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto relative flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${borderClass}`}
          >
            <div className={`p-1.5 rounded-xl shrink-0 ${badge}`}>{icon}</div>
            <div className="flex-1 text-xs font-semibold leading-relaxed break-words pt-0.5">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
