'use client'

// LessonViewer — read-only student-facing renderer for notebook content.
// Shares the same cell format: { type: 'notebook', cells: Cell[] }

import { useState } from 'react'
import './LessonEditor.css'
import type { Cell, CellType } from './LessonEditor'
import CodeMirror from '@uiw/react-codemirror'
import { sublime } from '@uiw/codemirror-theme-sublime'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { sql } from '@codemirror/lang-sql'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { EditorView } from '@codemirror/view'

function getCodeExtensions(language?: string) {
  const lang = (language || '').toLowerCase()
  if (lang.includes('typescript')) return [javascript({ typescript: true }), EditorView.lineWrapping]
  if (lang.includes('javascript')) return [javascript(), EditorView.lineWrapping]
  if (lang.includes('python')) return [python(), EditorView.lineWrapping]
  if (lang.includes('java')) return [java(), EditorView.lineWrapping]
  if (lang.includes('c++') || lang === 'cpp') return [cpp(), EditorView.lineWrapping]
  if (lang === 'c') return [cpp(), EditorView.lineWrapping]
  if (lang.includes('rust')) return [rust(), EditorView.lineWrapping]
  if (lang === 'go' || lang.includes('golang')) return [go(), EditorView.lineWrapping]
  if (lang.includes('sql')) return [sql(), EditorView.lineWrapping]
  if (lang.includes('json')) return [json(), EditorView.lineWrapping]
  if (lang.includes('html') || lang.includes('xml')) return [html(), EditorView.lineWrapping]
  if (lang.includes('css')) return [css(), EditorView.lineWrapping]
  return [EditorView.lineWrapping]
}

/* ── Helpers ── */
function normalizeSrc(src: string): string {
  const gd = src.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (gd) return `https://drive.google.com/uc?export=view&id=${gd[1]}`
  return src
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineHTML(text: string): string {
  let s = esc(text)
  s = s.replace(/==(.*?)==/g,     '<mark class="nb-highlight">$1</mark>')
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.*?)\*/g,     '<em>$1</em>')
  s = s.replace(/~~(.*?)~~/g,     '<del>$1</del>')
  s = s.replace(/`([^`]+?)`/g,    '<code class="nb-inline-code">$1</code>')
  s = s.replace(/!\[(.*?)\]\((.*?)\)/g,
    (_, alt, src) => `<img src="${normalizeSrc(src)}" alt="${esc(alt)}" class="nb-preview-img" />`)
  s = s.replace(/\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="nb-link">$1</a>')
  return s
}

function buildTable(rows: string[]): string {
  const isSep = (l: string) => /^\|[-:|\s]+\|$/.test(l.trim())
  const data  = rows.filter(r => !isSep(r))
  if (!data.length) return ''
  const cols = (row: string) => row.split('|').slice(1, -1).map(c => c.trim())
  const [hdr, ...body] = data
  const ths = cols(hdr).map(h => `<th>${inlineHTML(h)}</th>`).join('')
  const trs = body.map(r =>
    `<tr>${cols(r).map(c => `<td>${inlineHTML(c)}</td>`).join('')}</tr>`
  ).join('')
  return `<div class="nb-table-wrap"><table class="nb-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`
}

function buildChecklist(items: string[]): string {
  const lis = items.map(item => {
    const checked = /^- \[[xX]\]/.test(item)
    const text    = item.replace(/^- \[[ xX]\] ?/, '')
    return `<li class="nb-checklist-item"><input type="checkbox" class="nb-checkbox" ${checked ? 'checked' : ''} disabled /><span>${inlineHTML(text)}</span></li>`
  }).join('')
  return `<ul class="nb-checklist">${lis}</ul>`
}

function renderMarkdown(md: string): string {
  if (!md?.trim()) return '<span class="nb-empty-hint">—</span>'
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    const t   = raw.trim()
    // table
    if (t.startsWith('|') && i + 1 < lines.length && /^\|[-:|\s]+\|$/.test(lines[i + 1].trim())) {
      const tbl: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tbl.push(lines[i]); i++ }
      out.push(buildTable(tbl))
      continue
    }
    // checkbox
    if (/^- \[[ xX]\]/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^- \[[ xX]\]/.test(lines[i].trim())) { items.push(lines[i].trim()); i++ }
      out.push(buildChecklist(items))
      continue
    }
    // ul
    if (/^[-*] /.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) { items.push(lines[i].trim()); i++ }
      const lis = items.map(x => `<li>${inlineHTML(x.replace(/^[-*] /, ''))}</li>`).join('')
      out.push(`<ul class="nb-ul">${lis}</ul>`)
      continue
    }
    // ol
    if (/^\d+\. /.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) { items.push(lines[i].trim()); i++ }
      const lis = items.map(x => `<li>${inlineHTML(x.replace(/^\d+\. /, ''))}</li>`).join('')
      out.push(`<ol class="nb-ol">${lis}</ol>`)
      continue
    }
    if (t === '') { i++; continue }
    out.push(`<p class="nb-p">${inlineHTML(t)}</p>`)
    i++
  }
  return out.join('\n')
}

/* ── Callout config ── */
const CALLOUT_CONFIG: Record<string, { icon: string; label: string }> = {
  note:      { icon: '💡', label: 'Note' },
  info:      { icon: 'ℹ️',  label: 'Info' },
  tip:       { icon: '✅',  label: 'Tip' },
  important: { icon: '⚡',  label: 'Important' },
  caution:   { icon: '⚠️',  label: 'Caution' },
  warning:   { icon: '🔴',  label: 'Warning' },
}
const CALLOUT_TYPES = new Set(['note', 'info', 'tip', 'important', 'caution', 'warning'])

function CodePreviewBlock({ snippets }: { snippets: { lang: string, code: string }[] }) {
  const [activeTab, setActiveTab] = useState(0)
  const activeSnippet = snippets[activeTab] || snippets[0]

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
      <div className="w-full overflow-hidden rounded-b-lg border border-t-0 border-slate-700">
        <CodeMirror
          value={activeSnippet?.code || ''}
          height="auto"
          theme={sublime}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            autocompletion: false,
          }}
          extensions={getCodeExtensions(activeSnippet?.lang)}
          editable={false}
          readOnly={true}
        />
      </div>
    </div>
  )
}

/* ── Cell renderer ── */
function RenderCell({ cell }: { cell: Cell }) {
  if (cell.type === 'divider')
    return <hr className="nb-divider" />

  if (cell.type === 'image') {
    const m   = cell.content.match(/!\[.*?\]\((.*?)\)/)
    const src = m ? normalizeSrc(m[1]) : normalizeSrc(cell.content.trim())
    if (!src) return null
    return (
      <div className="nb-img-wrap">
        <img
          src={src}
          alt=""
          className="nb-preview-img"
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3' }}
        />
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

  if (CALLOUT_TYPES.has(cell.type)) {
    const cfg = CALLOUT_CONFIG[cell.type]
    return (
      <div className={`nb-callout nb-callout-${cell.type}`}>
        <div className="nb-callout-header">
          <span className="nb-callout-icon">{cfg.icon}</span>
          <strong className="nb-callout-label">{cfg.label}</strong>
        </div>
        <div
          className="nb-callout-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content) }}
        />
      </div>
    )
  }

  if (!cell.content.trim()) return null

  if (cell.type === 'heading')
    return <h1 className="nb-h1" dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />
  if (cell.type === 'subheading')
    return <h2 className="nb-h2" dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />
  if (cell.type === 'h3')
    return <h3 className="nb-h3" dangerouslySetInnerHTML={{ __html: inlineHTML(cell.content) }} />

  return (
    <div
      className="nb-text-block"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content) }}
    />
  )
}

/* ── Prop types ── */
interface LessonViewerProps {
  content: Record<string, any> | null | undefined
}

function parseCells(content: Record<string, any> | null | undefined): Cell[] {
  if (!content) return []
  if (content.type === 'notebook' && Array.isArray(content.cells))
    return content.cells as Cell[]
  if (content.type === 'markdown' && typeof content.source === 'string')
    return [{ id: 'v0', type: 'text', content: content.source }]
  return []
}

/* ── Main export ── */
export default function LessonViewer({ content }: LessonViewerProps) {
  const cells = parseCells(content)
  if (!cells.length) {
    return (
      <div className="nb-viewer">
        <p className="nb-empty-hint">No content yet.</p>
      </div>
    )
  }
  return (
    <div className="nb-viewer">
      {(() => {
        const pages: { id: string; cells: Cell[] }[] = [];
        let currentCells: Cell[] = [];
        
        cells.forEach((cell) => {
          if (cell.type === 'page-break') {
            pages.push({ id: cell.id, cells: currentCells });
            currentCells = [];
          } else {
            currentCells.push(cell);
          }
        });
        pages.push({ id: 'last-page', cells: currentCells });

        return pages.map((page, pIdx) => (
          <div key={page.id} className="nb-viewer-page-group">
            <div className="nb-a4-page shadow-md">
                <div className="text-[10px] text-slate-300 absolute top-2 right-4 font-mono select-none">PAGE {pIdx + 1}</div>
              {page.cells.map(cell => (
                <div key={cell.id} className="nb-viewer-cell">
                  <RenderCell cell={cell} />
                </div>
              ))}
            </div>
          </div>
        ));
      })()}
    </div>
  )
}
