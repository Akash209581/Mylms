'use client'
import React, { useRef, useState } from 'react'
import { API_URL } from '@/lib/api'
import { apiFetch } from '@/lib/apiFetch'

interface OptionFieldProps {
  index: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function resolveImageUrl(val: string): string {
  if (!val) return ''
  const trimmed = val.trim()
  if (trimmed.startsWith('/uploads/')) {
    return `${API_URL}${trimmed}`
  }
  return trimmed
}

export function isImageValue(val: string): boolean {
  if (!val) return false
  const trimmed = val.trim()
  return (
    trimmed.startsWith('/uploads/') ||
    /^(https?:\/\/|data:image\/).+(\.(png|jpg|jpeg|gif|webp|svg)|;base64)/i.test(trimmed) ||
    /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(trimmed) ||
    /^!\[.*?\]\(.*?\)$/.test(trimmed)
  )
}

export function extractImageUrl(val: string): string {
  if (!val) return ''
  const trimmed = val.trim()
  const match = trimmed.match(/^!\[.*?\]\((.*?)\)$/)
  const extracted = match && match[1] ? match[1] : trimmed
  return resolveImageUrl(extracted)
}

export default function OptionField({ index, value, onChange, disabled }: OptionFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const letter = String.fromCharCode(65 + index)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiFetch(`${API_URL}/question-bank/upload-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          onChange(data.url)
          return
        }
      }
      // Fallback to local base64 if server upload fails
      const reader = new FileReader()
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string
        onChange(base64)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Image upload failed, fallback to base64', err)
      const reader = new FileReader()
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string
        onChange(base64)
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSetUrl = () => {
    if (urlDraft.trim()) {
      onChange(urlDraft.trim())
      setUrlDraft('')
      setShowUrlInput(false)
    }
  }

  const hasImage = isImageValue(value)
  const imgUrl = hasImage ? extractImageUrl(value) : ''

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-slate-800 dark:text-slate-200 font-bold text-sm w-6 shrink-0">{letter}.</span>
        <input
          type="text"
          value={hasImage ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasImage ? `Image attached for Option ${letter}` : `Option ${letter} text...`}
          disabled={disabled || hasImage}
          className="input-field flex-1 text-sm bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 dark:bg-slate-900 dark:text-white dark:border-white/10"
        />
        
        {/* Hidden file input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={`Upload image for Option ${letter}`}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>🖼️</span>
            <span>Add Image</span>
          </button>
          
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            title={`Enter image URL for Option ${letter}`}
            className="px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10 transition-colors shadow-sm"
          >
            🔗 URL
          </button>
        </div>
      </div>

      {/* URL input row */}
      {showUrlInput && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
          <input
            type="url"
            placeholder="Paste image URL (e.g. https://example.com/image.png)"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            className="input-field flex-1 text-xs py-1.5 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 dark:bg-slate-900 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSetUrl()
              }
            }}
          />
          <button
            type="button"
            onClick={handleSetUrl}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => { setShowUrlInput(false); setUrlDraft('') }}
            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Image Preview Thumbnail */}
      {hasImage && (
        <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={imgUrl}
              alt={`Option ${letter} visual`}
              className="h-16 max-w-[140px] object-contain rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1"
              onError={(e: any) => {
                e.target.style.display = 'none'
              }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
              {imgUrl.startsWith('data:') ? 'Image uploaded' : imgUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-red-200 dark:border-red-500/30 shrink-0"
          >
            ✕ Remove Image
          </button>
        </div>
      )}
    </div>
  )
}
