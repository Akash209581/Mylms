'use client'

import React, { useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/* ═══════════════════════════════════════════════════════
   TYPES (Matches LessonEditor)
   ═══════════════════════════════════════════════════════ */
export type CellType =
  | 'heading' | 'subheading' | 'h3'
  | 'text' | 'code' | 'divider' | 'image' | 'video'
  | 'note' | 'info' | 'tip' | 'important' | 'caution' | 'warning'
  | 'page-break'

export interface Cell {
  id: string
  type: CellType
  content: string
  meta?: string
  color?: string
  fontSize?: number
  align?: 'left' | 'center' | 'right'
}

/* ═══════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════ */
const CALLOUT_CONFIG: Record<string, { icon: string; label: string }> = {
  note: { icon: '💡', label: 'Note' },
  info: { icon: 'ℹ️', label: 'Info' },
  tip: { icon: '✅', label: 'Tip' },
  important: { icon: '⚡', label: 'Important' },
  caution: { icon: '⚠️', label: 'Caution' },
  warning: { icon: '🔴', label: 'Warning' },
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */
function normalizeSrc(src: string): string {
  if (!src) return ''
  const gd = src.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (gd) return `https://drive.google.com/uc?export=view&id=${gd[1]}`
  return src
}

function esc(s: string): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function applyInlineMd(s: string): string {
  if (!s) return ''
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

function inlineHTML(text: string): string {
  if (!text) return ''
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

  if (!s.includes('<span')) return applyInline(s)
  const parts = s.split(/(<span[^>]*>[\s\S]*?<\/span>)/g)
  return parts.map((part, i) => {
    if (i % 2 === 0) return applyInline(part)
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
  if (!md?.trim()) return ''

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
    if (raw === undefined) { i++; continue }
    const t = raw.trim()

    if (t.startsWith('|') && i + 1 < lines.length && /^\|[-:|\s]+\|$/.test(lines[i + 1]?.trim() || '')) {
      const tbl: string[] = []
      while (i < lines.length && lines[i]?.trim().startsWith('|')) { tbl.push(lines[i]); i++ }
      out.push(buildTableHTML(tbl))
      continue
    }

    if (/^- \[[ xX]\]/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^- \[[ xX]\]/.test(lines[i]?.trim() || '')) { items.push(lines[i]?.trim() || ''); i++ }
      out.push(buildCheckboxHTML(items))
      continue
    }

    if (/^[-*] /.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i]?.trim() || '')) { items.push(lines[i]?.trim() || ''); i++ }
      const lis = items.map(x => `<li>${inlineHTML(x.replace(/^[-*] /, ''))}</li>`).join('')
      out.push(`<ul class="nb-ul">${lis}</ul>`)
      continue
    }

    if (/^\d+\. /.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i]?.trim() || '')) { items.push(lines[i]?.trim() || ''); i++ }
      const lis = items.map(x => `<li>${inlineHTML(x.replace(/^\d+\. /, ''))}</li>`).join('')
      out.push(`<ol class="nb-ol">${lis}</ol>`)
      continue
    }

    if (t === '') { i++; continue }
    out.push(`<p class="nb-p">${inlineHTML(t)}</p>`)
    i++
  }

  let finalHtml = out.join('\n')
  for (const [id, val] of Object.entries(mathMap)) {
    finalHtml = finalHtml.replace(id, val)
  }
  return finalHtml
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function CodeRow({ line, index }: { line: string; index: number }) {
  const escCode = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return (
    <div className="flex gap-4 px-4 py-0.5 hover:bg-white/5 transition-colors">
      <span className="text-gray-600 font-mono text-xs w-6 text-right select-none">{index + 1}</span>
      <div className="font-mono text-sm" dangerouslySetInnerHTML={{ __html: escCode(line) || '\u00a0' }} />
    </div>
  )
}

function CodeBlock({ snippets }: { snippets: { lang: string, code: string }[] }) {
  const [activeTab, setActiveTab] = useState(0)
  const activeSnippet = snippets[activeTab] || snippets[0]
  const lines = (activeSnippet?.code || '').split('\n')

  return (
    <div className="my-6 glass-card overflow-hidden border-none shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
        {snippets.length > 1 ? (
          <div className="flex bg-black/20 rounded-lg p-0.5 gap-0.5 ml-4">
            {snippets.map((s, i) => (
              <button
                key={i}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === i ? 'bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                onClick={() => setActiveTab(i)}
              >
                {s.lang || 'code'}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{activeSnippet?.lang || 'code'}</span>
        )}
      </div>
      <div className="bg-black/60 py-4 overflow-x-auto">
        <pre className="text-gray-300 leading-relaxed">
          {lines.map((line, i) => <CodeRow key={i} line={line} index={i} />)}
        </pre>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function LessonContentRenderer({ content }: { content: any }) {
  if (!content) return null

  const cells: Cell[] = Array.isArray(content) 
    ? content 
    : (content.type === 'notebook' && Array.isArray(content.cells)) 
      ? content.cells 
      : []

  if (cells.length === 0) {
    if (typeof content === 'string') {
      return (
        <div className="lesson-renderer">
          <div className="text-gray-300 leading-relaxed text-lg prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        </div>
      )
    }
    return null
  }

  return (
    <div className="lesson-renderer pb-12">
      {cells.map((cell) => {
        if (cell.type === 'divider' || cell.type === 'page-break') {
          return <hr key={cell.id} className="border-white/5 my-12" />
        }

        if (cell.type === 'image') {
          const m = cell.content.match(/!\[.*?\]\((.*?)\)/)
          const src = m ? normalizeSrc(m[1]) : normalizeSrc(cell.content.trim())
          if (!src) return null
          return (
            <div key={cell.id} className="my-8 rounded-3xl overflow-hidden glass-card border-none ring-1 ring-white/10 shadow-2xl">
              <img src={src} alt="" className="w-full max-h-[700px] object-contain bg-black/40" />
            </div>
          )
        }

        if (cell.type === 'video') {
          const src = cell.content.trim()
          if (!src) return null
          
          const ytMatch = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
          if (ytMatch) {
            return (
              <div key={cell.id} className="aspect-video w-full rounded-3xl overflow-hidden glass-card border-none my-8 shadow-2xl ring-1 ring-white/10">
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ytMatch[1]}`} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            )
          }
          
          const vmMatch = src.match(/(?:vimeo\.com\/)(\d+)/)
          if (vmMatch) {
            return (
              <div key={cell.id} className="aspect-video w-full rounded-2xl overflow-hidden glass-card border-none my-8 shadow-2xl ring-1 ring-white/10">
                <iframe className="w-full h-full" src={`https://player.vimeo.com/video/${vmMatch[1]}`} allowFullScreen allow="autoplay; fullscreen; picture-in-picture" />
              </div>
            )
          }
          
          return (
            <div key={cell.id} className="my-8">
              <video src={src} controls className="w-full rounded-3xl glass-card border-none shadow-2xl ring-1 ring-white/10" preload="metadata" />
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
          return <CodeBlock key={cell.id} snippets={snippets} />
        }

        if (CALLOUT_CONFIG[cell.type]) {
          const cfg = CALLOUT_CONFIG[cell.type]
          const colors = {
            warning: 'border-red-500 bg-red-500/10 text-red-200',
            caution: 'border-orange-500 bg-orange-500/10 text-orange-200',
            important: 'border-amber-500 bg-amber-500/10 text-amber-200',
            tip: 'border-green-500 bg-green-500/10 text-green-200',
            info: 'border-cyan-500 bg-cyan-500/10 text-cyan-200',
            note: 'border-indigo-500 bg-indigo-500/10 text-indigo-200',
          }
          return (
            <div key={cell.id} className={`p-6 rounded-3xl border-l-4 my-8 glass-card border-none ring-1 ring-white/5 relative overflow-hidden ${colors[cell.type as keyof typeof colors] || colors.note}`}>
              <div className={`absolute top-0 left-0 w-1 h-full bg-current opacity-80`} />
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-2xl">{cfg.icon}</span>
                <strong className="text-white font-bold tracking-wide uppercase text-xs">{cfg.label}</strong>
              </div>
              <div
                className="text-white/80 leading-relaxed text-lg"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content) }}
              />
            </div>
          )
        }

        const alignStyle = cell.align ? { textAlign: cell.align } as React.CSSProperties : undefined
        const cellStyle: React.CSSProperties = {
          ...alignStyle,
          ...(cell.color ? { color: cell.color } : {}),
          ...(cell.fontSize ? { fontSize: `${cell.fontSize}px` } : {}),
        }

        if (cell.type === 'heading') return <h1 key={cell.id} className="text-5xl font-extrabold text-white pt-10 pb-4 border-b border-white/10 mb-8 tracking-tight" style={alignStyle} dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />
        if (cell.type === 'subheading') return <h2 key={cell.id} className="text-3xl font-bold text-white pt-8 pb-2 mb-4 tracking-tight" style={alignStyle} dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />
        if (cell.type === 'h3') return <h3 key={cell.id} className="text-2xl font-bold text-indigo-400 mb-4 tracking-tight" style={alignStyle} dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />

        return (
          <div 
            key={cell.id} 
            style={cellStyle}
            className="text-gray-300 leading-relaxed text-xl mb-6 font-medium selection:bg-indigo-500/30"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content) }}
          />
        )
      })}
    </div>
  )
}
