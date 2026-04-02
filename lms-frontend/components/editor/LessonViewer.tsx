'use client'

// LessonViewer — read-only student-facing renderer for notebook content.
// Shares the same cell format: { type: 'notebook', cells: Cell[] }

import type { Cell, CellType } from './LessonEditor'

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
    const lines = (cell.content || '').split('\n')
    const lang  = cell.meta?.trim() || 'code'

    const highlight = (line: string): string => {
      let s = line
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      s = s.replace(/(^\/\/.*)/g,          '<span class="tok-comment">$1</span>')
      s = s.replace(/(\"[^\"]*\"|'[^']*'|`[^`]*`)/g, '<span class="tok-string">$1</span>')
      s = s.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|void|null|undefined|true|false|def|print|in|not|and|or|elif|pass|lambda|yield|self|public|private|static|int|str|bool|float|double|type|interface|enum|extends|implements)\b/g,
                    '<span class="tok-kw">$1</span>')
      s = s.replace(/\b(\d+\.?\d*)\b/g,    '<span class="tok-num">$1</span>')
      s = s.replace(/(\w+)(?=\()/g,        '<span class="tok-fn">$1</span>')
      return s
    }

    return (
      <div className="nb-code-wrap">
        <div className="nb-code-titlebar">
          <span className="nb-code-dot nb-dot-red" />
          <span className="nb-code-dot nb-dot-yellow" />
          <span className="nb-code-dot nb-dot-green" />
          <span className="nb-code-lang">{lang}</span>
        </div>
        <div className="nb-code-body">
          <div className="nb-code-gutter">
            {lines.map((_, i) => (
              <span key={i} className="nb-code-ln">{i + 1}</span>
            ))}
          </div>
          <pre className="nb-code-pre">
            {cell.content
              ? lines.map((line, i) => (
                  <div
                    key={i}
                    className="nb-code-line"
                    dangerouslySetInnerHTML={{ __html: highlight(line) || '\u00a0' }}
                  />
                ))
              : <span className="nb-empty-hint" style={{ padding: '0 12px' }}>// empty code block</span>
            }
          </pre>
        </div>
      </div>
    )
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
