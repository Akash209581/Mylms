import React, { useState, useRef, useEffect } from 'react'
import MathInkModal from './MathInkModal'

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onChange: (value: string) => void
}

export default function MarkdownToolbar({ textareaRef, onChange }: MarkdownToolbarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const text = el.value
    const selected = text.substring(start, end) || placeholder
    
    const newVal = text.substring(0, start) + before + selected + after + text.substring(end)
    onChange(newVal)

    // Reset cursor position
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string
      // Insert at current cursor position
      insertText(`![${file.name}](${base64})`, '', '')
    }
    reader.readAsDataURL(file)
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const insertBlock = (prefix: string, placeholder: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const text = el.value
    const isAtStartOfLine = start === 0 || text[start - 1] === '\n'
    const before = isAtStartOfLine ? prefix : '\n' + prefix
    insertText(before, '', placeholder)
  }

  const insertTooltip = () => {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const text = el.value
    const selected = text.substring(start, end) || 'hover term'
    const replacement = `[[${selected}|hover text]]`

    const newVal = text.substring(0, start) + replacement + text.substring(end)
    onChange(newVal)

    setTimeout(() => {
      el.focus()
      const cursorStart = start + 2 + selected.length + 1
      el.setSelectionRange(cursorStart, cursorStart + 10)
    }, 0)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--bg-surface)] border border-[var(--border)] border-b-0 rounded-t-xl shadow-sm">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />
      
      {/* Headings */}
      <button type="button" onClick={() => insertBlock('# ', 'Heading 1')} className="tb-btn" title="H1">H1</button>
      <button type="button" onClick={() => insertBlock('## ', 'Heading 2')} className="tb-btn" title="H2">H2</button>
      <button type="button" onClick={() => insertBlock('### ', 'Heading 3')} className="tb-btn" title="H3">H3</button>
      
      <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />
 
      {/* Formatting */}
      <button type="button" onClick={() => insertText('**', '**', 'Bold')} className="tb-btn font-bold" title="Bold">B</button>
      <button type="button" onClick={() => insertText('*', '*', 'Italic')} className="tb-btn italic" title="Italic">I</button>
      <button type="button" onClick={() => insertText('~~', '~~', 'Strikethrough')} className="tb-btn line-through" title="Strikethrough">S</button>
      <button type="button" onClick={() => insertText('==', '==', 'Highlight')} className="tb-btn bg-yellow-500/20" title="Highlight">H</button>
      
      <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />
 
      {/* Lists */}
      <button type="button" onClick={() => insertBlock('- ', 'Bullet Item')} className="tb-btn" title="Bullet List">•</button>
      <button type="button" onClick={() => insertBlock('1. ', 'Numbered Item')} className="tb-btn" title="Numbered List">1.</button>
      <button type="button" onClick={() => insertBlock('- [ ] ', 'Task')} className="tb-btn" title="Checklist">☑</button>
      
      <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />
 
      {/* Blocks */}
      <button type="button" onClick={() => insertText('```\n', '\n```', 'code here')} className="tb-btn" title="Code Block">{'<>'}</button>
      <button type="button" onClick={() => insertBlock('| Col 1 | Col 2 |\n|-------|-------|\n| ', 'Data  | Data  |')} className="tb-btn" title="Table">⊞</button>
      <MathDropdown onInsert={(formula) => insertText(formula, '', '')} />
      
      <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />
 
      {/* Media */}
      <button type="button" onClick={() => insertText('[', '](https://)', 'Link Text')} className="tb-btn text-[14px]" title="Add Link">🔗</button>
      <button type="button" onClick={() => fileInputRef.current?.click()} className="tb-btn text-[14px] bg-indigo-50 text-indigo-600 border-indigo-200" title="Upload Image">🖼️</button>
      <button type="button" onClick={insertTooltip} className="tb-btn text-[14px] bg-cyan-50 text-cyan-700 border-cyan-200" title="Insert Hover Tooltip">ⓘ</button>
 
      <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />
 
      {/* Callouts */}
      <button type="button" onClick={() => insertText(':::info\n', '\n:::', 'Info content')} className="tb-btn text-blue-500" title="Info Block">ℹ</button>
      <button type="button" onClick={() => insertText(':::note\n', '\n:::', 'Note content')} className="tb-btn text-yellow-500" title="Note Block">💡</button>
      <button type="button" onClick={() => insertText(':::warning\n', '\n:::', 'Warning content')} className="tb-btn text-red-500" title="Warning Block">⚠</button>
 
      
      <style jsx>{`
        .tb-btn {
          @apply px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-raised)] border border-[var(--border)] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm rounded-lg transition-all flex items-center justify-center min-w-[36px] font-sans;
        }
      `}</style>
    </div>
  )
}
 
function MathDropdown({ onInsert }: { onInsert: (formula: string) => void }) {
  const [open, setOpen] = useState(false)
  const [inkOpen, setInkOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
 
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
 
  const prebuilt = [
    { label: 'Inline Math', value: '$ a^2 + b^2 = c^2 $' },
    { label: 'Block Math', value: '$$\n x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} \n$$' },
    { label: 'Fraction', value: '$ \\frac{a}{b} $' },
    { label: 'Integral', value: '$ \\int_{a}^{b} x^2 dx $' },
    { label: 'Partial Derivative', value: '$ \\frac{\\partial y}{\\partial x} $' },
    { label: 'Matrix', value: '$ \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} $' },
  ]
 
  return (
    <div ref={ref} className="relative flex items-center" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className="tb-btn font-serif italic font-bold"
        title="Insert Math Formula"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-sm leading-none flex items-center pt-0.5">∑</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2, marginTop: 1 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-slate-950 border border-white/10 shadow-2xl rounded-2xl w-52 z-[999] py-1.5 overflow-hidden font-medium text-sm text-white animate-in fade-in slide-in-from-top-2 duration-100 backdrop-blur-md bg-opacity-95">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5 border-b border-white/5 font-sans">Math Formulas</div>
          {prebuilt.map(item => (
            <button
              key={item.label}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-between group font-sans transition-colors"
              onClick={() => { onInsert(item.value); setOpen(false) }}
            >
              <span className="font-semibold text-xs">{item.label}</span>
              <span className="text-[9px] text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">INSERT</span>
            </button>
          ))}
          <div className="border-t border-white/5 my-1" />
          <button
            type="button"
            className="w-full text-left px-3 py-2.5 hover:bg-indigo-600/20 text-indigo-300 hover:text-indigo-200 flex items-center justify-between group font-sans transition-colors"
            onClick={() => { setInkOpen(true); setOpen(false) }}
            title="Write to get formulas"
          >
            <span className="flex items-center gap-1.5 font-bold text-xs">
              <span>✍️</span> Draw Formula
            </span>
            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">INK</span>
          </button>
        </div>
      )}
      <MathInkModal
        isOpen={inkOpen}
        onClose={() => setInkOpen(false)}
        onInsert={onInsert}
      />
    </div>
  )
}
