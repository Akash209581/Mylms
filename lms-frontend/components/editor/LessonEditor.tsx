// THIS FILE IS DYNAMICALLY IMPORTED WITH ssr:false – browser-only
'use client'

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import './LessonEditor.css'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
export type CellType =
  | 'heading' | 'subheading' | 'h3'
  | 'text' | 'code' | 'divider' | 'image' | 'video'
  | 'note' | 'info' | 'tip' | 'important' | 'caution' | 'warning' | 'suggestion'
  | 'page-break'

export interface Cell {
  id: string
  type: CellType
  content: string
  meta?: string      // language hint for code cells
  color?: string     // text colour (hex) for text / callout cells
  fontSize?: number  // font size (px) for text / callout cells
  align?: 'left' | 'center' | 'right' // text alignment
}

interface NotebookContent {
  type: 'notebook'
  cells: Cell[]
}

export interface LessonEditorProps {
  lessonId: number
  initialContent?: Record<string, any> | null
  lessonTitle?: string
  onSave: (content: Record<string, any>) => Promise<void>
  onAddTopic?: () => void
  onBack?: () => void  // Navigate back to course outline
  readOnly?: boolean
  showPreviewByDefault?: boolean  // Default preview visibility
  fullPreviewTitle?: string
  plainCodePreview?: boolean
  isModal?: boolean
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/* ═══════════════════════════════════════════════════════
   CALLOUT CONFIG
═══════════════════════════════════════════════════════ */
const CALLOUT_TYPES = ['note', 'info', 'tip', 'important', 'caution', 'warning', 'suggestion'] as const
type CalloutType = typeof CALLOUT_TYPES[number]
const isCalloutType = (t: CellType): t is CalloutType =>
  (CALLOUT_TYPES as readonly string[]).includes(t)

const CALLOUT_CONFIG: Record<CalloutType, { icon: string; label: string }> = {
  note: { icon: '💡', label: 'Note' },
  info: { icon: 'ℹ️', label: 'Info' },
  tip: { icon: '✅', label: 'Tip' },
  important: { icon: '⚡', label: 'Important' },
  caution: { icon: '⚠️', label: 'Caution' },
  warning: { icon: '🔴', label: 'Warning' },
  suggestion: { icon: '🧠', label: 'Suggestion' },
}

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
let _ctr = 0
const uid = () => `c${Date.now()}-${++_ctr}`
const defaultCell = (type: CellType = 'text'): Cell => ({ id: uid(), type, content: '' })

function parseCells(content: Record<string, any> | null | undefined): Cell[] {
  if (!content) return [defaultCell('text')]
  if (content.type === 'notebook' && Array.isArray(content.cells) && content.cells.length > 0)
    return content.cells as Cell[]
  if (content.type === 'markdown' && typeof content.source === 'string')
    return [{ id: uid(), type: 'text', content: content.source }]
  return [defaultCell('text')]
}

/** Convert Google Drive share links to direct-embed URLs */
function normalizeSrc(src: string): string {
  const gd = src.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (gd) return `https://drive.google.com/uc?export=view&id=${gd[1]}`
  return src
}

/* ═══════════════════════════════════════════════════════
   MARKDOWN RENDERER
═══════════════════════════════════════════════════════ */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Core markdown → HTML transforms (operates on already-escaped text) */
function applyInlineMd(s: string): string {
  s = s.replace(/==(.*?)==/g, '<mark class="nb-highlight">$1</mark>')
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>')
  s = s.replace(/~~(.*?)~~/g, '<del>$1</del>')
  s = s.replace(/`([^`]+?)`/g, '<code class="nb-inline-code">$1</code>')
  s = s.replace(/!\[(.*?)\]\((.*?)\)/g,
    (_, alt, src) => `<img src="${normalizeSrc(src)}" alt="${esc(alt)}" class="nb-preview-img" />`)
  s = s.replace(/\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="nb-link">$1</a>')
  return s
}

/** Inline markdown → HTML — preserves <span style="..."> wrappers for colour/size */
function inlineHTML(text: string): string {
  // Extract Inline Math to avoid escaping
  const mathMap: Record<string, string> = {}
  let mathId = 0
  let s = text.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (match, prefix, eq) => {
    const id = `__MATH_INLINE_${mathId++}__`
    try { mathMap[id] = katex.renderToString(eq, { throwOnError: false }) }
    catch { mathMap[id] = `$${esc(eq)}$` }
    return prefix + id
  })

  const applyInline = (str: string) => {
    let html = applyInlineMd(esc(str))
    for (const [id, val] of Object.entries(mathMap)) {
      html = html.replace(id, val)
    }
    return html
  }

  // Fast path: no spans → escape then apply markdown
  if (!s.includes('<span')) return applyInline(s)
  // Split around <span ...>...</span> blocks (capture group keeps them in the array)
  const parts = s.split(/(<span[^>]*>[\s\S]*?<\/span>)/g)
  return parts.map((part, i) => {
    if (i % 2 === 0) return applyInline(part)  // plain text between spans
    // It’s a span — preserve wrapper, process content inside
    const m = part.match(/^(<span[^>]*>)([\s\S]*?)(<\/span>)$/)
    if (!m) return applyInline(part)
    return `${m[1]}${applyInline(m[2])}${m[3]}`
  }).join('')
}

function buildTableHTML(rows: string[]): string {
  const isSep = (l: string) => /^\|[-:|\s]+\|$/.test(l.trim())
  const data = rows.filter(r => !isSep(r))
  if (!data.length) return ''
  const cols = (row: string) =>
    row.split('|').slice(1, -1).map(c => c.trim())
  const [hdr, ...body] = data
  const ths = cols(hdr).map(h => `<th>${inlineHTML(h)}</th>`).join('')
  const trs = body.map(r =>
    `<tr>${cols(r).map(c => `<td>${inlineHTML(c)}</td>`).join('')}</tr>`
  ).join('')
  return `<div class="nb-table-wrap"><table class="nb-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`
}

function buildCheckboxHTML(items: string[]): string {
  const lis = items.map(item => {
    const checked = /^- \[[xX]\]/.test(item)
    const text = item.replace(/^- \[[ xX]\] ?/, '')
    return `<li class="nb-checklist-item"><input type="checkbox" class="nb-checkbox" ${checked ? 'checked' : ''} disabled /><span>${inlineHTML(text)}</span></li>`
  }).join('')
  return `<ul class="nb-checklist">${lis}</ul>`
}

function renderMarkdown(md: string): string {
  if (!md?.trim()) return '<span class="nb-empty-hint">—</span>'

  // Extract block math (can contain newlines)
  const mathMap: Record<string, string> = {}
  let mathId = 0
  let processedMd = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, eq) => {
    const id = `__MATH_BLOCK_${mathId++}__`
    try { mathMap[id] = katex.renderToString(eq, { displayMode: true, throwOnError: false }) }
    catch { mathMap[id] = `$$${esc(eq)}$$` }
    return id
  })

  const lines = processedMd.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    const t = raw.trim()

    // Table: current line starts with | and next line is a separator
    if (t.startsWith('|') && i + 1 < lines.length && /^\|[-:|\s]+\|$/.test(lines[i + 1].trim())) {
      const tbl: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tbl.push(lines[i]); i++ }
      out.push(buildTableHTML(tbl))
      continue
    }

    // Checkbox
    if (/^- \[[ xX]\]/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^- \[[ xX]\]/.test(lines[i].trim())) { items.push(lines[i].trim()); i++ }
      out.push(buildCheckboxHTML(items))
      continue
    }

    // Unordered list
    if (/^[-*] /.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) { items.push(lines[i].trim()); i++ }
      const lis = items.map(x => `<li>${inlineHTML(x.replace(/^[-*] /, ''))}</li>`).join('')
      out.push(`<ul class="nb-ul">${lis}</ul>`)
      continue
    }

    // Ordered list
    if (/^\d+\.(?:\s|$)/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.(?:\s|$)/.test(lines[i].trim())) { items.push(lines[i].trim()); i++ }
      const lis = items.map(x => `<li>${inlineHTML(x.replace(/^\d+\.\s*/, ''))}</li>`).join('')
      out.push(`<ol class="nb-ol">${lis}</ol>`)
      continue
    }

    if (t === '') { i++; continue }
    out.push(`<p class="nb-p">${inlineHTML(t)}</p>`)
    i++
  }

  // Restore block math into the final HTML
  let finalHtml = out.join('\n')
  for (const [id, val] of Object.entries(mathMap)) {
    finalHtml = finalHtml.replace(id, val)
  }
  return finalHtml
}

/* ═══════════════════════════════════════════════════════
   CELL PREVIEW  (used in read-only right pane)
═══════════════════════════════════════════════════════ */
function CellPreview({ cell, calloutOrder, plainCodePreview = false }: { cell: Cell; calloutOrder?: number; plainCodePreview?: boolean }) {
  if (cell.type === 'divider' || cell.type === 'page-break') return <hr className="nb-divider" />

  if (cell.type === 'image') {
    const m = cell.content.match(/!\[.*?\]\((.*?)\)/)
    const src = m ? normalizeSrc(m[1]) : normalizeSrc(cell.content.trim())
    if (!src) return <span className="nb-empty-hint">No image source</span>
    return (
      <div className="nb-img-wrap">
        <img src={src} alt="" className="nb-preview-img"
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3' }} />
      </div>
    )
  }

  if (cell.type === 'video') {
    const src = cell.content.trim()
    if (!src) return <span className="nb-empty-hint">No video URL</span>
    // YouTube Support
    const ytMatch = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    if (ytMatch) {
      return (
        <div className="nb-video-wrap aspect-video w-full rounded-lg overflow-hidden bg-slate-900 my-2">
          <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ytMatch[1]}`} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      )
    }
    // Vimeo Support
    const vmMatch = src.match(/(?:vimeo\.com\/)(\d+)/)
    if (vmMatch) {
      return (
        <div className="nb-video-wrap aspect-video w-full rounded-lg overflow-hidden bg-slate-900 my-2">
          <iframe className="w-full h-full" src={`https://player.vimeo.com/video/${vmMatch[1]}`} allowFullScreen allow="autoplay; fullscreen; picture-in-picture" />
        </div>
      )
    }
    // Standard HTML5 Video
    return (
      <div className="nb-video-wrap my-2">
        <video src={src} controls className="nb-preview-video w-full rounded-lg border border-[var(--border)]" preload="metadata" />
      </div>
    )
  }

  function CodePreviewBlock({ snippets }: { snippets: { lang: string, code: string }[] }) {
    const [activeTab, setActiveTab] = useState(0)
    const activeSnippet = snippets[activeTab] || snippets[0]
    const lines = (activeSnippet?.code || '').split('\n')

    const highlight = (line: string): string => {
      let s = line
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      s = s.replace(/(^\/\/.*)/g, '<span class="tok-comment">$1</span>')
      s = s.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="tok-string">$1</span>')
      s = s.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|void|null|undefined|true|false|def|print|in|not|and|or|elif|pass|lambda|yield|self|public|private|static|void|int|str|bool|float|double|type|interface|enum|extends|implements)\b/g,
        '<span class="tok-kw">$1</span>')
      s = s.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>')
      s = s.replace(/(\w+)(?=\()/g, '<span class="tok-fn">$1</span>')
      return s
    }

    return (
      <div className="nb-code-wrap">
        <div className="nb-code-titlebar flex items-center justify-between">
          <div />
          {snippets.length > 1 ? (
            <div className="flex bg-[#2d3148] rounded-md p-0.5 gap-0.5">
              {snippets.map((s, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === i ? 'bg-[#3b4261] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]'}`}
                  onClick={() => setActiveTab(i)}
                >
                  {s.lang || 'code'}
                </button>
              ))}
            </div>
          ) : (
            <span className="nb-code-lang">{activeSnippet?.lang || 'code'}</span>
          )}
        </div>
        <div className="nb-code-body">
          <div className="nb-code-gutter">
            {lines.map((_, i) => <span key={i} className="nb-code-ln">{i + 1}</span>)}
          </div>
          <pre className="nb-code-pre">
            {activeSnippet?.code
              ? lines.map((line, i) => (
                <div key={i} className="nb-code-line" dangerouslySetInnerHTML={{ __html: highlight(line) || '\u00a0' }} />
              ))
              : <span className="nb-empty-hint" style={{ padding: '0 12px' }}>// empty code block…</span>
            }
          </pre>
        </div>
      </div>
    )
  }

  if (cell.type === 'code') {
    let snippets: { lang: string, code: string }[] = []
    if (cell.content.trim().startsWith('[') && cell.content.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(cell.content)
        if (Array.isArray(parsed) && parsed.every(p => typeof p.lang === 'string' && typeof p.code === 'string')) {
          snippets = parsed
        }
      } catch { /* ignore */ }
    }
    if (snippets.length === 0) snippets = [{ lang: cell.meta?.trim() || 'code', code: cell.content }]
    return <CodePreviewBlock snippets={snippets} />
  }

  if (isCalloutType(cell.type)) {
    const cfg = CALLOUT_CONFIG[cell.type]
    return (
      <div className={`nb-callout nb-callout-${cell.type}`}>
        <div className="nb-callout-header">
          <span className="nb-callout-icon">{cfg.icon}</span>
          <strong className="nb-callout-label">{cfg.label}{calloutOrder ? ` ${calloutOrder}` : ''}</strong>
        </div>
        <div
          className="nb-callout-body"
          /* NOTE: content is user-created; only trusted internal users author lessons */
          dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content) }}
        />
      </div>
    )
  }

  if (!cell.content.trim()) {
    const hints: Partial<Record<CellType, string>> = {
      heading: 'Heading…', subheading: 'Subheading…', h3: 'Section title…', text: 'Start writing…',
    }
    return <span className="nb-empty-hint">{hints[cell.type] ?? ''}</span>
  }

  const alignStyle = cell.align ? { textAlign: cell.align } as React.CSSProperties : undefined

  if (cell.type === 'heading')
    return <h1 className="nb-h1" style={alignStyle} dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />
  if (cell.type === 'subheading')
    return <h2 className="nb-h2" style={alignStyle} dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />
  if (cell.type === 'h3')
    return <h3 className="nb-h3" style={alignStyle} dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />

  // 'text' and callouts — wrap with colour/size/align if set on the cell
  const cellStyle: React.CSSProperties = {
    ...alignStyle,
    ...(cell.color ? { color: cell.color } : {}),
    ...(cell.fontSize ? { fontSize: `${cell.fontSize}px` } : {}),
  }
  const hasCellStyle = cell.color || cell.fontSize || cell.align

  return (
    <div style={hasCellStyle ? cellStyle : undefined}
      className="nb-text-block"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content) }}
    />
  )
}

/* ═══════════════════════════════════════════════════════
   ADD CELL MENU
═══════════════════════════════════════════════════════ */
const ALL_INSERTABLE: CellType[] = [
  'heading', 'subheading', 'h3', 'text', 'code', 'divider', 'image', 'video',
  'note', 'info', 'tip', 'important', 'caution', 'warning', 'suggestion', 'page-break',
]

const CELL_LABELS: Record<CellType, string> = {
  heading: 'H1 Heading', subheading: 'H2 Subheading', h3: 'H3 Section',
  text: 'Text', code: 'Code Block', divider: '── Divider', image: 'Image', video: 'Video',
  note: '💡 Note', info: 'ℹ️ Info', tip: '✅ Tip',
  important: '⚡ Important', caution: '⚠️ Caution', warning: '🔴 Warning', suggestion: '🧠 Suggestion',
  'page-break': '📄 New Page',
}

const CELL_BADGE: Record<CellType, string> = {
  heading: 'H1', subheading: 'H2', h3: 'H3', text: 'T',
  code: '</>', divider: '—', image: '📷', video: '📹',
  note: '💡', info: 'ℹ️', tip: '✅', important: '⚡', caution: '⚠️', warning: '🔴', suggestion: '🧠',
  'page-break': '📄',
}

function AddCellMenu({ onAdd }: { onAdd: (t: CellType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="nb-add-row" onClick={e => e.stopPropagation()}>
      <div className="nb-add-line" />
      <button
        className="nb-add-btn"
        title="Add cell"
        onClick={() => setOpen(v => !v)}
      >+</button>
      <div className="nb-add-line" />
      {open && (
        <div className="nb-add-menu" onClick={e => e.stopPropagation()}>
          {ALL_INSERTABLE.map(t => (
            <button key={t} className="nb-add-item" onClick={() => { onAdd(t); setOpen(false) }}>
              <span className="nb-add-item-badge">{CELL_BADGE[t]}</span>
              {CELL_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   CALLOUT DROPDOWN  — toolbar trigger with flyout menu
═══════════════════════════════════════════════════════ */
const CALLOUT_ITEMS: { type: CalloutType; icon: string; label: string; cls: string }[] = [
  { type: 'note', icon: '💡', label: 'Note', cls: 'text-blue-700' },
  { type: 'info', icon: 'ℹ️', label: 'Info', cls: 'text-cyan-700' },
  { type: 'tip', icon: '✅', label: 'Tip', cls: 'text-green-700' },
  { type: 'important', icon: '⚡', label: 'Important', cls: 'text-yellow-700' },
  { type: 'caution', icon: '⚠️', label: 'Caution', cls: 'text-orange-700' },
  { type: 'warning', icon: '🔴', label: 'Warning', cls: 'text-red-700' },
  { type: 'suggestion', icon: '🧠', label: 'Suggestion', cls: 'text-violet-700' },
]

function CalloutDropdown({ onAdd }: { onAdd: (t: CalloutType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="nb-callout-dd" onClick={e => e.stopPropagation()}>
      <button
        className="nb-tbtn nb-callout-trigger"
        title="Insert callout block"
        onClick={() => setOpen(v => !v)}
      >
        <span className="nb-callout-trigger-icon">H</span>
        <svg width="9" height="9" viewBox="0 0 10 6" fill="currentColor" style={{ marginLeft: 2 }}>
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>
      {open && (
        <div className="nb-callout-menu">
          <p className="nb-callout-menu-label">Callout blocks</p>
          {CALLOUT_ITEMS.map(({ type, icon, label, cls }) => (
            <button
              key={type}
              className={`nb-callout-menu-item ${cls}`}
              onClick={() => { onAdd(type); setOpen(false) }}
            >
              <span className="nb-callout-menu-icon">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MediaMenu({ onImage, onVideo }: { onImage: () => void, onVideo: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex items-center" onClick={e => e.stopPropagation()}>
      <button
        className="nb-tbtn"
        title="Insert Media (Image / Video)"
        onClick={() => setOpen(v => !v)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <polyline points="21 15 16 10 5 21" />
          <circle cx="8.5" cy="8.5" r="1.5" />
        </svg>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2, marginTop: 1 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-[var(--bg-surface)] border border-[var(--border)] shadow-xl rounded-lg w-40 z-50 py-1 overflow-hidden font-medium text-sm text-[var(--text-primary)] animate-in fade-in slide-in-from-top-2 duration-100">
          <button
            className="w-full text-left px-3 py-2 hover:bg-[var(--bg-raised)] flex items-center gap-2"
            onClick={() => { onImage(); setOpen(false) }}
          >
            <span className="text-base leading-none">📷</span> Image
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-[var(--bg-raised)] flex items-center gap-2"
            onClick={() => { onVideo(); setOpen(false) }}
          >
            <span className="text-base leading-none">📹</span> Video List/Cell
          </button>
        </div>
      )}
    </div>
  )
}

function MathDropdown({ onInsert }: { onInsert: (formula: string) => void }) {
  const [open, setOpen] = useState(false)
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
    { label: 'Fraction', value: '\\frac{a}{b}' },
    { label: 'Integral', value: '\\int_{a}^{b} x^2 dx' },
    { label: 'Matrix', value: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
  ]

  return (
    <div ref={ref} className="relative flex items-center" onClick={e => e.stopPropagation()}>
      <button
        className="nb-tbtn font-serif italic font-bold"
        title="Insert Math Formula"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-sm leading-none flex items-center pt-0.5">∑</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2, marginTop: 1 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-[var(--bg-surface)] border border-[var(--border)] shadow-xl rounded-lg w-48 z-50 py-1 overflow-hidden font-medium text-sm text-[var(--text-primary)] animate-in fade-in slide-in-from-top-2 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-[var(--bg-raised)] shadow-inner">Math Formulas</div>
          {prebuilt.map(item => (
            <button
              key={item.label}
              className="w-full text-left px-3 py-2 hover:bg-[var(--bg-raised)] flex items-center justify-between group"
              onClick={() => { onInsert(item.value); setOpen(false) }}
            >
              <span>{item.label}</span>
              <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">INSERT</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface ImageDialogProps {
  onInsert: (markdown: string) => void
  onClose: () => void
}

function ImageDialog({ onInsert, onClose }: ImageDialogProps) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleInsert = () => {
    if (!url.trim()) return
    onInsert(`![${alt || 'image'}](${url.trim()})`)
    onClose()
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      onInsert(`![${file.name}](${evt.target?.result as string})`)
      onClose()
    }
    reader.readAsDataURL(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="nb-modal-overlay" onClick={onClose}>
      <div className="nb-modal" onClick={e => e.stopPropagation()}>
        <div className="nb-modal-header">
          <span>Insert Image</span>
          <button className="nb-modal-close" onClick={onClose}>✕</button>
        </div>

        <label className="nb-modal-label">Image URL (Cloudinary, Google Drive, or direct link)</label>
        <input
          className="nb-modal-input"
          placeholder="https://…"
          value={url}
          autoFocus
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleInsert() }}
        />

        <label className="nb-modal-label">Alt text (optional)</label>
        <input
          className="nb-modal-input"
          placeholder="Describe the image…"
          value={alt}
          onChange={e => setAlt(e.target.value)}
        />

        <div className="nb-modal-or"><span>— or upload from your PC —</span></div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="nb-modal-file"
          onChange={handleFile}
        />

        <div className="nb-modal-actions">
          <button className="nb-modal-btn nb-modal-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="nb-modal-btn nb-modal-btn-primary"
            onClick={handleInsert}
            disabled={!url.trim()}
          >Insert</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   TEXT STYLE CONFIG
═══════════════════════════════════════════════════════ */
const TEXT_COLORS: { name: string; value: string | null; swatch: string }[] = [
  { name: 'Default', value: null, swatch: '#94a3b8' },
  { name: 'Slate', value: '#475569', swatch: '#475569' },
  { name: 'Red', value: '#dc2626', swatch: '#dc2626' },
  { name: 'Orange', value: '#ea580c', swatch: '#ea580c' },
  { name: 'Amber', value: '#d97706', swatch: '#d97706' },
  { name: 'Emerald', value: '#059669', swatch: '#059669' },
  { name: 'Teal', value: '#0d9488', swatch: '#0d9488' },
  { name: 'Blue', value: '#2563eb', swatch: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5', swatch: '#4f46e5' },
  { name: 'Purple', value: '#7c3aed', swatch: '#7c3aed' },
  { name: 'Pink', value: '#db2777', swatch: '#db2777' },
]
const TEXT_SIZES: { name: string; px: number | null }[] = [
  { name: 'Small', px: 13 },
  { name: 'Normal', px: null },
  { name: 'Large', px: 20 },
  { name: 'XL', px: 24 },
]
const FORMATTABLE_TYPES: CellType[] = ['text', 'note', 'info', 'tip', 'important', 'caution', 'warning', 'suggestion']

/* ── Color Picker ── */
interface ColorPickerProps { activeColor: string | null; disabled: boolean; onApply: (c: string | null) => void }
function ColorPicker({ activeColor, disabled, onApply }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [customHex, setCustomHex] = useState('#000000')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button title="Text colour" disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`nb-tbtn flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[32px] ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}>
        <span className="text-sm font-extrabold leading-none text-[var(--text-primary)] select-none">A</span>
        <span className="w-4 h-[3px] rounded-full transition-colors" style={{ background: activeColor ?? '#94a3b8' }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-3.5 w-56"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.14),0 2px 8px rgba(0,0,0,0.06)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Text Colour</p>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {TEXT_COLORS.map(c => (
              <button key={c.name} title={c.name}
                onClick={() => { onApply(c.value); setOpen(false) }}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110
                  ${activeColor === c.value ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : ''}`}
                style={{ background: c.swatch }}>
                {c.value === null && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="9" x2="9" y2="1" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2.5 border-t border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wide">Custom</span>
            <input type="color" value={customHex} className="w-7 h-6 cursor-pointer rounded border border-[var(--border)] p-0.5"
              onChange={e => setCustomHex(e.target.value)} />
            <button onClick={() => { onApply(customHex); setOpen(false) }}
              className="ml-auto text-[11px] text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">Apply</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Font Size Picker ── */
interface FontSizePickerProps { activeSize: number | null; disabled: boolean; onApply: (px: number | null) => void }
function FontSizePicker({ activeSize, disabled, onApply }: FontSizePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [open])
  const currentName = TEXT_SIZES.find(s => s.px === activeSize)?.name ?? 'Normal'
  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button title="Font size" disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`nb-tbtn flex items-center gap-1 px-2 py-1 text-xs font-semibold ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}>
        <span className="text-[var(--text-primary)] min-w-[38px] text-left">{currentName}</span>
        <svg width="8" height="8" viewBox="0 0 10 6" fill="currentColor" className="text-slate-400 flex-shrink-0"><path d="M0 0l5 6 5-6z" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden w-36"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.14),0 2px 8px rgba(0,0,0,0.06)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5 pt-3 pb-1.5">Font Size</p>
          {TEXT_SIZES.map(s => (
            <button key={s.name} onClick={() => { onApply(s.px); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors hover:bg-[var(--bg-raised)]
                ${activeSize === s.px ? 'text-indigo-700 font-bold bg-indigo-50/60' : 'text-[var(--text-primary)]'}`}>
              <span style={{ fontSize: s.px ? `${Math.min(s.px, 18)}px` : undefined }}>{s.name}</span>
              {activeSize === s.px && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
            </button>
          ))}
          <div className="h-2" />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   STATUS PILL
═══════════════════════════════════════════════════════ */
function StatusPill({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const MAP = {
    saving: { label: 'Saving…', cls: 'text-amber-500' },
    saved: { label: 'Saved ✓', cls: 'text-emerald-600 font-semibold' },
    error: { label: 'Save failed', cls: 'text-red-500 font-semibold' },
  }
  const { label, cls } = MAP[status as keyof typeof MAP]
  return <span className={`text-xs ${cls}`}>{label}</span>
}

function PageBreakIndicator({ idx, onRemove }: { idx: number, onRemove: () => void }) {
  return (
    <div className="nb-page-break-divider group">
      <div className="nb-page-break-line" />
      <div className="nb-page-break-label">Page Break (Starts Page {idx + 2})</div>
      <button 
        className="absolute right-0 z-10 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-full"
        onClick={onRemove}
        title="Remove page break (merges pages)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════
   MULTI-LANGUAGE CODE HELPERS
═══════════════════════════════════════════════════════ */

/** Parse code cell content to extract language snippets */
function parseCodeSnippets(content: string): { lang: string; code: string }[] {
  if (!content.trim()) return []
  if (content.trim().startsWith('[') && content.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed) && parsed.every(p => typeof p.lang === 'string' && typeof p.code === 'string')) {
        return parsed
      }
    } catch { /* invalid JSON */ }
  }
  return []
}

/** Update a specific language snippet in code cell */
function updateCodeSnippet(
  currentContent: string,
  languageIndex: number,
  newCode: string
): string {
  let snippets = parseCodeSnippets(currentContent)
  if (snippets.length === 0) {
    // Single language mode, convert to multi-language
    snippets = [{ lang: 'code', code: currentContent }]
  }
  if (languageIndex >= 0 && languageIndex < snippets.length) {
    snippets[languageIndex].code = newCode
  }
  return JSON.stringify(snippets)
}

/** Add a new language snippet to code cell */
function addCodeSnippet(currentContent: string, language: string): string {
  let snippets = parseCodeSnippets(currentContent)
  if (snippets.length === 0) {
    snippets = [{ lang: 'code', code: currentContent }]
  }
  // Avoid duplicates
  if (!snippets.find(s => s.lang === language)) {
    snippets.push({ lang: language, code: '' })
  }
  return JSON.stringify(snippets)
}

/** Remove a language snippet from code cell */
function removeCodeSnippet(currentContent: string, languageIndex: number): string {
  let snippets = parseCodeSnippets(currentContent)
  if (snippets.length > 1) {
    snippets.splice(languageIndex, 1)
    return JSON.stringify(snippets)
  }
  // Keep at least one snippet
  return currentContent
}

const COMMON_LANGUAGES = [
  'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go',
  'Rust', 'TypeScript', 'HTML', 'CSS', 'SQL', 'Bash', 'Shell', 'JSON',
  'XML', 'Kotlin', 'Swift', 'R', 'Scala', 'Groovy', 'Perl', 'Dart'
]

/* ═══════════════════════════════════════════════════════
   MAIN EDITOR COMPONENT
═══════════════════════════════════════════════════════ */
export default function LessonEditor({
  lessonId: _lessonId,
  initialContent,
  lessonTitle: _lessonTitle,
  onSave,
  onAddTopic,
  onBack,
  readOnly = false,
  showPreviewByDefault = false,
  fullPreviewTitle = 'Full Course Preview',
  plainCodePreview = false,
  isModal = false,
}: LessonEditorProps) {
  const [cells, setCells] = useState<Cell[]>(() => parseCells(initialContent))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [imgTarget, setImgTarget] = useState<string | null>(null)
  const [fullPreview, setFullPreview] = useState(false)
  const [showPreview, setShowPreview] = useState(showPreviewByDefault)  // Toggle preview visibility
  const [currentPageIdx, setCurrentPageIdx] = useState(0)  // Track current page for navigation
  const [lastColor, setLastColor] = useState<string | null>(null)
  const [lastSizePx, setLastSizePx] = useState<number | null>(null)
  const [activeCodeTabs, setActiveCodeTabs] = useState<Record<string, number>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const isUndoRedo = useRef(false)
  const historyRef = useRef<Record<string, { past: string[], future: string[], lastPush: number }>>({})

  /* ── auto-save ── */
  const triggerSave = useCallback(
    (updated: Cell[]) => {
      if (readOnly) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          await onSave({ type: 'notebook', cells: updated })
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch { setSaveStatus('error') }
      }, 2500)
    },
    [onSave, readOnly],
  )
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  /* ── Undo / Redo history (per cell, debounced 400 ms) ── */
  const pushHistory = (id: string, content: string) => {
    const h = historyRef.current[id] ?? { past: [], future: [], lastPush: 0 }
    const now = Date.now()
    if (now - h.lastPush > 400) {
      h.past = [...h.past.slice(-49), content]
      h.future = []
      h.lastPush = now
    }
    historyRef.current[id] = h
  }

  const undoCell = (id: string) => {
    const h = historyRef.current[id]
    if (!h?.past.length) return
    const prev = h.past[h.past.length - 1]
    const cur = cells.find(c => c.id === id)?.content ?? ''
    h.future = [cur, ...h.future.slice(0, 49)]
    h.past = h.past.slice(0, -1)
    historyRef.current[id] = h
    isUndoRedo.current = true
    updateCell(id, { content: prev })
    setTimeout(() => { taRefs.current[id]?.focus() }, 10)
  }

  const redoCell = (id: string) => {
    const h = historyRef.current[id]
    if (!h?.future.length) return
    const next = h.future[0]
    const cur = cells.find(c => c.id === id)?.content ?? ''
    h.past = [...h.past.slice(-49), cur]
    h.future = h.future.slice(1)
    historyRef.current[id] = h
    isUndoRedo.current = true
    updateCell(id, { content: next })
    setTimeout(() => { taRefs.current[id]?.focus() }, 10)
  }

  /* ── cell mutations ── */
  const updateCell = (id: string, patch: Partial<Cell>) => {
    setCells(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...patch } : c)
      triggerSave(next)
      return next
    })
  }

  const insertCell = (afterId: string | null, type: CellType = 'text') => {
    const fresh = defaultCell(type)
    const trailingText = type === 'page-break' ? defaultCell('text') : null
    setCells(prev => {
      const next = [...prev]
      const idx = afterId ? next.findIndex(c => c.id === afterId) : next.length - 1
      if (trailingText) {
        next.splice(idx + 1, 0, fresh, trailingText)
      } else {
        next.splice(idx + 1, 0, fresh)
      }
      triggerSave(next)
      return next
    })
    const focusId = trailingText ? trailingText.id : fresh.id
    setTimeout(() => { setActiveId(focusId); taRefs.current[focusId]?.focus() }, 40)
  }

  const deleteCell = (id: string) => {
    setCells(prev => {
      const next = prev.length === 1 ? [defaultCell('text')] : prev.filter(c => c.id !== id)
      triggerSave(next)
      return next
    })
    setActiveId(null)
  }

  const moveCell = (id: string, dir: 'up' | 'down') => {
    setCells(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === prev.length - 1) return prev
      const next = [...prev]
      const swap = dir === 'up' ? idx - 1 : idx + 1
        ;[next[idx], next[swap]] = [next[swap], next[idx]]
      triggerSave(next)
      return next
    })
  }

  /* ── insert markdown at textarea cursor ── */
  const insertAtCursor = (id: string, text: string) => {
    const ta = taRefs.current[id]
    if (!ta) return
    const s = ta.selectionStart ?? ta.value.length
    const e = ta.selectionEnd ?? ta.value.length
    const next = ta.value.substring(0, s) + text + ta.value.substring(e)
    updateCell(id, { content: next })
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + text.length }, 10)
  }

  /* ── wrap selected text with markdown syntax ── */
  const wrapSelection = (id: string, pre: string, post: string, fallback: string) => {
    const ta = taRefs.current[id]
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const inner = value.substring(s, e) || fallback
    const next = value.substring(0, s) + pre + inner + post + value.substring(e)
    updateCell(id, { content: next })
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = s + pre.length
      ta.selectionEnd = s + pre.length + inner.length
    }, 10)
  }

  /* ── toolbar actions ── */
  type FmtAction = 'bold' | 'italic' | 'inlinecode' | 'highlight' | 'link' | 'image'
    | 'ul' | 'ol' | 'checklist' | 'table'
  const applyFmt = (fmt: FmtAction) => {
    if (!activeId) return
    if (fmt === 'bold') { wrapSelection(activeId, '**', '**', 'bold text'); return }
    if (fmt === 'italic') { wrapSelection(activeId, '*', '*', 'italic text'); return }
    if (fmt === 'inlinecode') { wrapSelection(activeId, '`', '`', 'code'); return }
    if (fmt === 'highlight') { wrapSelection(activeId, '==', '==', 'highlighted text'); return }
    if (fmt === 'link') { wrapSelection(activeId, '[', '](https://)', 'link text'); return }
    if (fmt === 'image') { setImgTarget(activeId); return }
    if (fmt === 'ul') { insertAtCursor(activeId, '- Item 1\n- Item 2\n- Item 3'); return }
    if (fmt === 'ol') { insertAtCursor(activeId, '1. First\n2. Second\n3. Third'); return }
    if (fmt === 'checklist') {
      insertAtCursor(activeId, '- [ ] Task 1\n- [ ] Task 2\n- [x] Completed task')
      return
    }
    if (fmt === 'table') {
      insertAtCursor(activeId,
        '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell A | Cell B | Cell C |\n| Cell D | Cell E | Cell F |')
    }
  }

  /* ── heading buttons: change active cell's type ── */
  const setHeading = (type: 'heading' | 'subheading' | 'h3') => {
    if (activeId) { updateCell(activeId, { type }); return }
    insertCell(cells[cells.length - 1]?.id ?? null, type)
  }

  /* ── add a cell type below active (for callouts / divider) ── */
  const addBelow = (type: CellType) => {
    const targetId = activeId ?? cells[cells.length - 1]?.id ?? null
    insertCell(targetId, type)
  }

  /* ── get all pages (split by page-break) ── */
  const getAllPages = () => {
    const pages: { id: string; cells: Cell[] }[] = []
    let current: Cell[] = []
    cells.forEach(c => {
      if (c.type === 'page-break') {
        pages.push({ id: c.id, cells: current })
        current = []
      } else {
        current.push(c)
      }
    })
    pages.push({ id: 'last', cells: current })
    return pages
  }

  const getIndexedPages = () => {
    const pages: { id: string; cells: { cell: Cell; originalIdx: number }[] }[] = []
    let current: { cell: Cell; originalIdx: number }[] = []

    cells.forEach((cell, i) => {
      if (cell.type === 'page-break') {
        pages.push({ id: cell.id, cells: current })
        current = []
      } else {
        current.push({ cell, originalIdx: i })
      }
    })

    pages.push({ id: 'last-page', cells: current })
    return pages
  }

  /* ── navigate to next page ── */
  const goToNextPage = () => {
    const totalPages = getAllPages().length
    if (currentPageIdx < totalPages - 1) {
      setCurrentPageIdx(currentPageIdx + 1)
    }
  }

  /* ── navigate to previous page ── */
  const goToPrevPage = () => {
    if (currentPageIdx > 0) {
      setCurrentPageIdx(currentPageIdx - 1)
    }
  }

  const addPageAfterCurrent = () => {
    const pages = getIndexedPages()
    const page = pages[currentPageIdx]
    if (!page) return

    // Insert a page break after the current page boundary.
    let anchorId: string | null = null
    if (page.cells.length > 0) {
      anchorId = page.cells[page.cells.length - 1].cell.id
    } else if (page.id !== 'last-page') {
      anchorId = page.id
    } else {
      anchorId = cells[cells.length - 1]?.id ?? null
    }

    insertCell(anchorId, 'page-break')
    setCurrentPageIdx(currentPageIdx + 1)
  }

  const deleteCurrentPage = () => {
    const pages = getIndexedPages()
    const totalPages = pages.length
    if (!totalPages) return

    // Keep at least one editable page in the document.
    if (totalPages === 1) {
      const next = [defaultCell('text')]
      setCells(next)
      triggerSave(next)
      setActiveId(next[0].id)
      setCurrentPageIdx(0)
      return
    }

    const idx = Math.min(currentPageIdx, totalPages - 1)
    const page = pages[idx]
    if (!page) return

    const idsToRemove = new Set<string>()
    page.cells.forEach(({ cell }) => idsToRemove.add(cell.id))

    // If deleting a non-last page, remove its trailing break.
    if (page.id !== 'last-page') {
      idsToRemove.add(page.id)
    } else {
      // If deleting the last page, remove previous page's break to merge correctly.
      const prev = pages[idx - 1]
      if (prev && prev.id !== 'last-page') idsToRemove.add(prev.id)
    }

    setCells(prev => {
      const filtered = prev.filter(c => !idsToRemove.has(c.id))
      const next = filtered.length ? filtered : [defaultCell('text')]
      triggerSave(next)
      return next
    })

    const nextIdx = idx >= totalPages - 1 ? Math.max(0, idx - 1) : idx
    setCurrentPageIdx(nextIdx)
    setActiveId(null)
  }

  useEffect(() => {
    const totalPages = getAllPages().length
    if (currentPageIdx > totalPages - 1) {
      setCurrentPageIdx(Math.max(0, totalPages - 1))
    }
  }, [cells, currentPageIdx])

  /* ── apply colour to active formattable cell (stored in metadata) ── */
  const applyColor = (color: string | null) => {
    setLastColor(color)
    if (!activeId) return
    const cell = cells.find(c => c.id === activeId)
    if (!cell || !FORMATTABLE_TYPES.includes(cell.type)) return
    updateCell(activeId, { color: color ?? undefined })
  }

  /* ── apply font-size to active formattable cell (stored in metadata) ── */
  const applyFontSize = (px: number | null) => {
    setLastSizePx(px)
    if (!activeId) return
    const cell = cells.find(c => c.id === activeId)
    if (!cell || !FORMATTABLE_TYPES.includes(cell.type)) return
    updateCell(activeId, { fontSize: px ?? undefined })
  }

  /* ── toggle text alignment to active formattable/heading cell ── */
  const applyAlign = (align: 'left' | 'center' | 'right') => {
    if (!activeId) return
    const cell = cells.find(c => c.id === activeId)
    if (!cell) return
    const isHeading = ['heading', 'subheading', 'h3'].includes(cell.type)
    if (!FORMATTABLE_TYPES.includes(cell.type) && !isHeading) return
    updateCell(activeId, { align: cell.align === align ? undefined : align })
  }

  /* ── auto-grow textarea ── */
  const autoGrow = (ta: HTMLTextAreaElement | null) => {
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }

  /* ── keyboard shortcuts ── */
  const handleKeyDown = (e: React.KeyboardEvent, cell: Cell) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); setActiveId(null); return }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoCell(cell.id); return }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoCell(cell.id); return }
  }

  /* ── textarea class ── */
  const taClass = (type: CellType): string => {
    const base = 'nb-textarea w-full bg-transparent outline-none resize-none leading-relaxed border-none p-0'
    if (type === 'heading') return `${base} text-3xl font-bold tracking-tight`
    if (type === 'subheading') return `${base} text-2xl font-bold`
    if (type === 'h3') return `${base} text-xl font-semibold`
    if (type === 'code') return `${base} font-mono text-sm`
    return `${base} text-base`
  }

  /* ── image insert callback ── */
  const handleImageInsert = (md: string) => {
    if (!imgTarget) return
    insertAtCursor(imgTarget, md)
    setImgTarget(null)
  }

  const calloutOrderByCellId = (() => {
    const counters: Partial<Record<CalloutType, number>> = {}
    const map: Record<string, number> = {}
    cells.forEach(c => {
      if (isCalloutType(c.type)) {
        counters[c.type] = (counters[c.type] ?? 0) + 1
        map[c.id] = counters[c.type] as number
      }
    })
    return map
  })()

  /* ════════════════════════════════════════
     FULL SPLIT-PANE EDITOR
     ════════════════════════════════════════ */
  return (
    <div 
      className="nb-editor-v2" 
      onClick={() => setActiveId(null)}
      style={{ '--nb-sticky-top': (isModal || readOnly) ? '0px' : '64px' } as React.CSSProperties}
    >

      {/* ── Sticky header: topbar + toolbar ── */}
      <div className="nb-sticky-header" onClick={e => e.stopPropagation()}>

        {/* Top bar */}
        <div className="nb-topbar-v2">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Content Notebook</span>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={saveStatus} />
            <button
              title="Save content immediately"
              onClick={async () => {
                if (readOnly) return
                setSaveStatus('saving')
                try {
                  await onSave({ type: 'notebook', cells })
                  setSaveStatus('saved')
                  setTimeout(() => setSaveStatus('idle'), 2000)
                } catch { setSaveStatus('error') }
              }}
              className="nb-tbtn flex items-center gap-1.5 text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-raised)] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save
            </button>
            <button
              title="Toggle preview pane visibility"
              onClick={() => setShowPreview(!showPreview)}
              className={`nb-tbtn flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                showPreview 
                  ? 'text-indigo-600 border border-indigo-200 bg-indigo-50' 
                  : 'text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
            <button
              title="Full-screen preview — see how the entire course looks to students"
              onClick={() => setFullPreview(true)}
              className="nb-tbtn flex items-center gap-1.5 text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 11h6M12 9v6" strokeWidth="2" />
              </svg>
              Full Course
            </button>
            {onBack && (
              <button
                title="Go back to course outline"
                onClick={onBack}
                className="nb-tbtn flex items-center gap-1.5 text-slate-600 border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="nb-toolbar-v2">

          {/* Undo / Redo */}
          <div className="nb-tbg">
            <button
              className="nb-tbtn"
              title="Undo — Ctrl+Z"
              onClick={() => { if (activeId) undoCell(activeId) }}
              disabled={!activeId}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" /><path d="M3 13C5.4 8 10.5 5 16 5a9 9 0 0 1 7 14" />
              </svg>
            </button>
            <button
              className="nb-tbtn"
              title="Redo — Ctrl+Y"
              onClick={() => { if (activeId) redoCell(activeId) }}
              disabled={!activeId}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6" /><path d="M21 13C18.6 8 13.5 5 8 5a9 9 0 0 0-7 14" />
              </svg>
            </button>
          </div>
          <span className="nb-tb-sep2" />

          {/* Text colour + font size — only active for text/callout cells */}
          {(() => {
            const activeCell = cells.find(c => c.id === activeId)
            const canStyle = !!activeCell && FORMATTABLE_TYPES.includes(activeCell.type)
            return (
              <>
                <div className="nb-tbg items-center">
                  {!readOnly && (
                    <>
                      <ColorPicker
                        activeColor={activeCell?.color ?? lastColor}
                        disabled={!canStyle}
                        onApply={applyColor}
                      />
                      <FontSizePicker
                        activeSize={activeCell?.fontSize ?? lastSizePx}
                        disabled={!canStyle}
                        onApply={applyFontSize}
                      />
                    </>
                  )}
                </div>
                <span className="nb-tb-sep2" />
              </>
            )
          })()}

          {!readOnly && (
            <>
              {/* Headings */}
              <div className="nb-tbg">
                <button className="nb-tbtn" title="Heading 1 — changes active cell type" onClick={() => setHeading('heading')}>H1</button>
                <button className="nb-tbtn" title="Heading 2 — changes active cell type" onClick={() => setHeading('subheading')}>H2</button>
                <button className="nb-tbtn" title="Heading 3 — changes active cell type" onClick={() => setHeading('h3')}>H3</button>
              </div>
              <span className="nb-tb-sep2" />

              {/* Inline formatting */}
              <div className="nb-tbg">
                <button className="nb-tbtn font-bold" title="Bold — wraps selection with **bold**" onClick={() => applyFmt('bold')}>B</button>
                <button className="nb-tbtn italic" title="Italic — wraps selection with *italic*" onClick={() => applyFmt('italic')}>I</button>
                <button className="nb-tbtn font-mono text-xs" title="Insert code block cell" onClick={() => addBelow('code')}>&lt;/&gt;</button>
                <button className="nb-tbtn" title="Highlight — wraps selection with ==text==" onClick={() => applyFmt('highlight')}>
                  <span className="bg-yellow-200 px-0.5 rounded text-xs font-bold leading-none py-0.5">H</span>
                </button>
              </div>
              <span className="nb-tb-sep2" />

              {/* Links & Media */}
              <div className="nb-tbg">
                <button className="nb-tbtn" title="Insert link — [text](url)" onClick={() => applyFmt('link')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
                <MediaMenu onImage={() => applyFmt('image')} onVideo={() => addBelow('video')} />
              </div>
              <span className="nb-tb-sep2" />

              {/* Alignment */}
              <div className="nb-tbg">
                <button className={`nb-tbtn ${cells.find(c => c.id === activeId)?.align === 'left' ? 'text-indigo-600 bg-indigo-50' : ''}`} title="Align Left" onClick={() => applyAlign('left')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" x2="3" y1="6" y2="6" /><line x1="15" x2="3" y1="12" y2="12" /><line x1="17" x2="3" y1="18" y2="18" />
                  </svg>
                </button>
                <button className={`nb-tbtn ${cells.find(c => c.id === activeId)?.align === 'center' ? 'text-indigo-600 bg-indigo-50' : ''}`} title="Align Center" onClick={() => applyAlign('center')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" x2="3" y1="6" y2="6" /><line x1="19" x2="5" y1="12" y2="12" /><line x1="21" x2="3" y1="18" y2="18" />
                  </svg>
                </button>
              </div>
              <span className="nb-tb-sep2" />

              {/* Lists */}
              <div className="nb-tbg">
                <button className="nb-tbtn" title="Bullet list — inserts - Item at cursor" onClick={() => applyFmt('ul')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="3" cy="6" r="1.5" fill="currentColor" />
                    <circle cx="3" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="3" cy="18" r="1.5" fill="currentColor" />
                  </svg>
                </button>
                <button className="nb-tbtn" title="Numbered list — inserts 1. First at cursor" onClick={() => applyFmt('ol')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
                    <path d="M4 6h1v4" strokeLinecap="round" /><path d="M4 10h2" />
                    <path d="M4 15a1 1 0 0 1 1-1h0a1 1 0 0 1 0 2H4a1 1 0 0 0 0 2h2" />
                  </svg>
                </button>
                <button className="nb-tbtn" title="Checklist — inserts - [ ] Task at cursor" onClick={() => applyFmt('checklist')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="5" width="6" height="6" rx="1" />
                    <polyline points="5 8 6.5 9.5 9 6" />
                    <line x1="13" y1="8" x2="21" y2="8" />
                    <rect x="3" y="13" width="6" height="6" rx="1" />
                    <line x1="13" y1="16" x2="21" y2="16" />
                  </svg>
                </button>
                <button className="nb-tbtn" title="Table — inserts a 3×2 markdown table at cursor" onClick={() => applyFmt('table')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
                    <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
                  </svg>
                </button>
              </div>
              <span className="nb-tb-sep2" />

              {/* Divider & Math */}
              <div className="nb-tbg">
                <MathDropdown onInsert={(formula) => { if (activeId) insertAtCursor(activeId, formula) }} />
                <button className="nb-tbtn" title="Add divider cell below" onClick={() => addBelow('divider')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                </button>
              </div>
              <span className="nb-tb-sep2" />

              {/* Callout blocks — dropdown */}
              <div className="flex items-center">
                <CalloutDropdown onAdd={t => addBelow(t)} />
                <button 
                  className="nb-tbtn group relative ml-1 flex items-center justify-center p-1.5 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all" 
                  title="Add New A4 Page"
                  onClick={(e) => {
                    e.stopPropagation();
                    addPageAfterCurrent();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="indigo" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12" strokeWidth="3" /><line x1="9" y1="15" x2="15" y2="15" strokeWidth="3" />
                  </svg>
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">New Page</span>
                </button>
              </div>

              {onAddTopic && (
                <>
                  <span className="nb-tb-sep2" />
                  <button 
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-900/20 active:scale-95"
                    onClick={onAddTopic}
                    title="Add a new topic/page to this course"
                  >
                    <span>➕</span> New Topic
                  </button>
                </>
              )}
            </>
          )}
        </div>{/* end nb-toolbar-v2 */}
      </div>{/* end nb-sticky-header */}

      {/* ── Split pane ── */}
      <div className={`nb-split ${!showPreview ? 'nb-split-no-preview' : ''}`} onClick={e => e.stopPropagation()}>

        {/* LEFT — writing pane */}
        <div className="nb-write-pane">
          <div className="nb-pane-label">WRITE</div>
          <div className="nb-cells-list">
            {(() => {
              const pages = getIndexedPages();
              const totalPages = pages.length;
              const activePageIdx = Math.min(currentPageIdx, Math.max(0, totalPages - 1));
              const page = pages[activePageIdx];

              if (!page) return null;

              return (
                <div key={page.id} className="nb-page-group group/group">
                  <div className="nb-a4-page shadow-xl">
                    <div className="absolute top-2 right-4 flex items-center gap-2">
                      <div className="text-[10px] text-slate-300 font-mono select-none">PAGE {activePageIdx + 1}</div>
                      {!readOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCurrentPage()
                          }}
                          title="Delete current page"
                          className="text-[10px] font-semibold px-2 py-0.5 rounded border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={totalPages === 1}
                        >
                          Delete Page
                        </button>
                      )}
                    </div>
                    {page.cells.map(({ cell, originalIdx }) => {
                      const idx = originalIdx;
                      const isActive = activeId === cell.id
                      const isCallout = isCalloutType(cell.type)
                      const calloutCfg = isCallout ? CALLOUT_CONFIG[cell.type as CalloutType] : null
                      const calloutOrder = isCallout ? calloutOrderByCellId[cell.id] : undefined

                      /* ── Read-only mode: Render clean preview ── */
                      if (readOnly) {
                        if (cell.type === 'page-break') return null;
                        if (cell.type === 'divider') return <div key={cell.id} className="py-4"><hr className="nb-divider" /></div>;
                        return (
                          <div key={cell.id} className="mb-4">
                            <CellPreview cell={cell} calloutOrder={calloutOrder} plainCodePreview={plainCodePreview} />
                          </div>
                        );
                      }

                      /* ── Divider cell ── */
                      if (cell.type === 'divider') {
                        return (
                          <div key={cell.id}>
                            <div className="nb-divider-row group">
                              <hr className="nb-divider" />
                              <div className="nb-cell-actions opacity-0 group-hover:opacity-100">
                                <button className="nb-action-btn" title="Move up" disabled={idx === 0} onClick={() => moveCell(cell.id, 'up')}>↑</button>
                                <button className="nb-action-btn" title="Move down" disabled={idx === cells.length - 1} onClick={() => moveCell(cell.id, 'down')}>↓</button>
                                <button className="nb-action-btn nb-action-delete" title="Delete" onClick={() => deleteCell(cell.id)}>✕</button>
                              </div>
                            </div>
                            {!readOnly && <AddCellMenu onAdd={t => insertCell(cell.id, t)} />}
                          </div>
                        )
                      }

                      /* ── Normal / callout cell ── */
                      return (
                        <div key={cell.id}>
                          <div
                            className={[
                              'nb-cell-v2 group/cell',
                              isActive ? 'nb-cell-active' : '',
                              isCallout ? `nb-cell-callout nb-callout-${cell.type}` : '',
                            ].join(' ')}
                            onClick={e => {
                                if (readOnly) return;
                                e.stopPropagation();
                                setActiveId(cell.id);
                            }}
                          >
                            {/* Cell header row */}
                            <div className="nb-cell-header">
                              <span className={`nb-indicator-v2 nb-ind-${cell.type}`}>
                                {calloutCfg
                                  ? `${calloutCfg.icon} ${calloutCfg.label}${calloutOrder ? ` ${calloutOrder}` : ''}`
                                  : CELL_BADGE[cell.type]}
                              </span>

                              {/* Type selector */}
                              {isActive && !isCallout && (
                                <select
                                  className="nb-type-select-v2"
                                  value={cell.type}
                                  onChange={e => updateCell(cell.id, { type: e.target.value as CellType })}
                                  onClick={e => e.stopPropagation()}
                                >
                                  {(Object.entries(CELL_LABELS) as [CellType, string][])
                                    .filter(([t]) => !(['divider', 'note', 'info', 'tip', 'important', 'caution', 'warning', 'suggestion', 'page-break'] as CellType[]).includes(t))
                                    .map(([t, l]) => <option key={t} value={t}>{l}</option>)}
                                </select>
                              )}

                              {/* Move / delete */}
                              {!readOnly && (
                                <div className="nb-cell-actions opacity-0 group-hover/cell:opacity-100 ml-auto" onClick={e => e.stopPropagation()}>
                                  <button className="nb-action-btn" title="Move up" disabled={idx === 0} onClick={() => moveCell(cell.id, 'up')}>↑</button>
                                  <button className="nb-action-btn" title="Move down" disabled={idx === cells.length - 1} onClick={() => moveCell(cell.id, 'down')}>↓</button>
                                  <button className="nb-action-btn nb-action-delete" title="Delete cell" onClick={() => deleteCell(cell.id)}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                                      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Textarea — simplified */}
                            {cell.type === 'code' ? (
                               <div className="nb-code-write-wrap">
                                  {/* Multi-language code block UI */}
                                  {(() => {
                                    const snippets = parseCodeSnippets(cell.content)
                                    const hasMultiple = snippets.length > 1
                                    const activeTab = activeCodeTabs[cell.id] ?? 0
                                    const currentSnippet = snippets[activeTab] || { lang: 'code', code: cell.content || '' }
                                    
                                    return (
                                      <div className="w-full">
                                        {/* Language tabs header (right side) */}
                                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                                          <span className="text-xs font-semibold text-slate-600">Languages</span>
                                          <div className="flex items-center gap-1">
                                            {/* Language tabs */}
                                            <div className="flex gap-1">
                                              {snippets.map((snip, idx) => (
                                                <button
                                                  key={idx}
                                                  onClick={() => setActiveCodeTabs({ ...activeCodeTabs, [cell.id]: idx })}
                                                  className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                                                    activeTab === idx
                                                      ? 'bg-indigo-500 text-white'
                                                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                  }`}
                                                >
                                                  {snip.lang}
                                                </button>
                                              ))}
                                            </div>
                                            
                                            {/* Add language button */}
                                            {!readOnly && (
                                              <div className="relative group/addlang">
                                                <button
                                                  className="ml-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                                                  title="Add language"
                                                >
                                                  +
                                                </button>
                                                {/* Language dropdown menu */}
                                                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-300 rounded-lg shadow-lg opacity-0 invisible group-hover/addlang:opacity-100 group-hover/addlang:visible transition-all z-50 max-h-64 overflow-y-auto">
                                                  {COMMON_LANGUAGES.map(lang => (
                                                    <button
                                                      key={lang}
                                                      onClick={() => {
                                                        updateCell(cell.id, {
                                                          content: addCodeSnippet(cell.content, lang)
                                                        })
                                                      }}
                                                      disabled={snippets.some(s => s.lang === lang)}
                                                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                      {lang}
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Remove language button (only if multiple languages) */}
                                            {!readOnly && hasMultiple && (
                                              <button
                                                onClick={() => {
                                                  const newContent = removeCodeSnippet(cell.content, activeTab)
                                                  updateCell(cell.id, { content: newContent })
                                                  // Auto-switch to previous tab if current was removed
                                                  if (activeTab > 0) {
                                                    setActiveCodeTabs({ ...activeCodeTabs, [cell.id]: activeTab - 1 })
                                                  }
                                                }}
                                                className="ml-1 px-2.5 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                                                title="Remove language"
                                              >
                                                ✕
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Code editor textarea */}
                                        <div className="nb-code-write-body relative">
                                          <div className="nb-code-write-gutter" aria-hidden>
                                            {(currentSnippet.code || '').split('\n').map((_, i) => (
                                              <span key={i} className="nb-code-ln">{i + 1}</span>
                                            ))}
                                            {!currentSnippet.code && <span className="nb-code-ln">1</span>}
                                          </div>
                                          <textarea
                                            ref={el => { taRefs.current[cell.id] = el }}
                                            value={currentSnippet.code || ''}
                                            placeholder={`// Write ${currentSnippet.lang} code here…`}
                                            className="nb-code-write-ta"
                                            spellCheck={false}
                                            readOnly={readOnly}
                                            onChange={e => {
                                              if (!isUndoRedo.current) pushHistory(cell.id, cell.content)
                                              isUndoRedo.current = false
                                              const newContent = updateCodeSnippet(cell.content, activeTab, e.target.value)
                                              updateCell(cell.id, { content: newContent })
                                              autoGrow(e.target)
                                            }}
                                            onFocus={e => { setActiveId(cell.id); autoGrow(e.target) }}
                                            onKeyDown={e => handleKeyDown(e, cell)}
                                          />
                                        </div>
                                      </div>
                                    )
                                  })()}
                               </div>
                            ) : cell.type === 'image' ? (
                              <textarea
                                ref={el => { taRefs.current[cell.id] = el }}
                                value={cell.content}
                                placeholder="![alt](url)"
                                className={taClass('image')}
                                rows={1}
                                spellCheck={false}
                                style={{ minHeight: 40 }}
                                onChange={e => {
                                  if (!isUndoRedo.current) pushHistory(cell.id, cell.content)
                                  isUndoRedo.current = false
                                  updateCell(cell.id, { content: e.target.value })
                                  autoGrow(e.target)
                                }}
                                onFocus={e => { setActiveId(cell.id); autoGrow(e.target) }}
                                onKeyDown={e => handleKeyDown(e, cell)}
                              />
                            ) : (
                              <textarea
                                ref={el => { taRefs.current[cell.id] = el }}
                                value={cell.content}
                                readOnly={readOnly}
                                placeholder="Start typing… (markdown supported)"
                                className={taClass(cell.type)}
                                rows={1}
                                style={{
                                  minHeight: 40,
                                  color: cell.color || undefined,
                                  fontSize: cell.fontSize ? `${cell.fontSize}px` : undefined,
                                }}
                                onChange={e => {
                                  if (!isUndoRedo.current) pushHistory(cell.id, cell.content)
                                  isUndoRedo.current = false
                                  updateCell(cell.id, { content: e.target.value })
                                  autoGrow(e.target)
                                }}
                                onFocus={e => { setActiveId(cell.id); autoGrow(e.target) }}
                                onKeyDown={e => handleKeyDown(e, cell)}
                              />
                            )}
                          </div>
                          {!readOnly && <AddCellMenu onAdd={t => insertCell(cell.id, t)} />}
                        </div>
                      );
                    })}
                    {/* Page navigation at bottom center */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-3 mt-8 pt-6 border-t border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            goToPrevPage()
                          }}
                          disabled={activePageIdx === 0}
                          className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 rounded-lg transition-all flex items-center gap-1.5"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Prev
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                          Page {activePageIdx + 1} / {totalPages}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            goToNextPage()
                          }}
                          disabled={activePageIdx === totalPages - 1}
                          className="px-3 py-2 text-xs font-semibold bg-indigo-100 hover:bg-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-700 rounded-lg transition-all flex items-center gap-1.5"
                        >
                          Next
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* RIGHT — preview pane */}
        {showPreview && (
          <div className="nb-preview-pane">
            <div className="nb-pane-label flex items-center justify-between">
              <span>PREVIEW</span>
              <span className="text-[10px] font-mono text-slate-400">Page Navigation</span>
            </div>
            <div className="nb-cells-preview">
              {(() => {
                const pages = getAllPages()
                const currentPage = pages[currentPageIdx] || pages[0]
                const totalPages = pages.length
                
                return (
                  <>
                    {/* Display current page only in preview pane */}
                    <div className="nb-a4-page shadow-md mb-4 mx-auto scale-[0.85] origin-top">
                      <div className="text-[10px] text-slate-300 absolute top-2 right-4 font-mono select-none">PAGE {currentPageIdx + 1}/{totalPages}</div>
                        {currentPage.cells.map(c => <div key={c.id} className="nb-preview-cell"><CellPreview cell={c} calloutOrder={calloutOrderByCellId[c.id]} plainCodePreview={plainCodePreview} /></div>)}
                    </div>
                    
                    {/* Page navigation controls */}
                    {totalPages > 1 && (
                      <div className="flex gap-2 justify-center items-center mt-6 px-4 py-4 border-t border-slate-200">
                        <button
                          onClick={goToPrevPage}
                          disabled={currentPageIdx === 0}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-1"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                          Prev
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono px-2 py-1 bg-slate-50 rounded">
                          {currentPageIdx + 1} / {totalPages}
                        </span>
                        <button
                          onClick={goToNextPage}
                          disabled={currentPageIdx === totalPages - 1}
                          className="px-3 py-1.5 text-xs font-semibold bg-indigo-100 hover:bg-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-700 rounded-lg transition-all flex items-center gap-1"
                        >
                          Next
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Image dialog */}
      {imgTarget && (
        <ImageDialog
          onInsert={handleImageInsert}
          onClose={() => setImgTarget(null)}
        />
      )}

      {/* Full-screen preview overlay */}
      {fullPreview && (
        <div className="fixed inset-0 z-50 bg-[#f1f5f9] overflow-auto" style={{ animation: 'fadeIn 0.15s ease' }}>
          <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-3 bg-white/95 backdrop-blur-sm border-b border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-600">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              <span className="font-bold text-[var(--text-primary)] text-base">{fullPreviewTitle}</span>
              <span className="text-xs text-slate-400">How students will see your content</span>
            </div>
            <button
              onClick={() => setFullPreview(false)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-hover)] hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Close Preview
            </button>
          </div>
          <div className="w-full px-8 py-10 bg-[#f1f5f9]">
            {(() => {
              const pages = getAllPages()
              return pages.map((p, i) => (
                <div key={p.id} className="nb-a4-page shadow-2xl mb-12 mx-auto">
                  <div className="text-[10px] text-slate-300 absolute top-2 right-4 font-mono select-none">PAGE {i + 1}</div>
                    {p.cells.map(c => <div key={c.id} className="nb-viewer-cell mb-1"><CellPreview cell={c} calloutOrder={calloutOrderByCellId[c.id]} plainCodePreview={plainCodePreview} /></div>)}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <p className="nb-hint-v2">
        Click a cell to edit · Ctrl+Z / Ctrl+Y to undo/redo · Ctrl+Enter to deselect
      </p>
    </div>
  )
}
