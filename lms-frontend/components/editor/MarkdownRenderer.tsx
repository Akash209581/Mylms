import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { sanitizeHtml } from '@/lib/sanitize'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content?.trim()) {
    return <span className="text-gray-400 italic">No content provided</span>
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const inlineHTML = (text: string): string => {
    let s = esc(text)

    // Protect inline code blocks `...` first so they are not affected by formatting
    const inlineCodes: string[] = []
    s = s.replace(/`([^`]+?)`/g, (_match, codeText) => {
      const placeholder = `__INLINE_CODE_${inlineCodes.length}__`
      inlineCodes.push(codeText)
      return placeholder
    })

    // Hover tooltip syntax: [[term|hover text]]
    s = s.replace(/\[\[([^\]|]+?)\|([^\]]+?)\]\]/g, (_match, term, tip) => {
      const tooltip = esc(String(tip).trim())
      return `<span class="nb-tooltip-term" data-tooltip="${tooltip}">${term}</span>`
    })
    
    // Inline Math
    s = s.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (match, prefix, eq) => {
      try {
        const rendered = katex.renderToString(eq, { throwOnError: false })
        return prefix + rendered
      } catch {
        return match
      }
    })

    // Highlight text with ^^text^^ (or explicit <mark> tags), avoiding programming operators like ==
    s = s.replace(/\^\^([^\^]+?)\^\^/g, '<mark class="bg-yellow-200 text-black px-1 rounded">$1</mark>')
    s = s.replace(/&lt;mark&gt;(.*?)&lt;\/mark&gt;/gi, '<mark class="bg-yellow-200 text-black px-1 rounded">$1</mark>')
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>')
    s = s.replace(/!\[([^\]]*?)\]\(\s*([^\)]+?)\s*\)/g, (_match, alt, src) => {
      const cleanSrc = src.trim()
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
      const fullSrc = cleanSrc.startsWith('/uploads/') ? `${API_URL}${cleanSrc}` : cleanSrc
      return `<img src="${fullSrc}" alt="${alt}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-lg my-2 shadow-sm" />`
    })
    s = s.replace(/!\[([^\]]*?)\]\s*(https?:\/\/[^\s)]+|\/uploads\/[^\s)]+)(?=\s|$)/g, (_match, alt, src) => {
      const cleanSrc = src.trim()
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
      const fullSrc = cleanSrc.startsWith('/uploads/') ? `${API_URL}${cleanSrc}` : cleanSrc
      return `<img src="${fullSrc}" alt="${alt}" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-lg my-2 shadow-sm" />`
    })
    s = s.replace(/\[([^\]]+?)\]\(([^)\s]+?)\)/g, (_match, text, href) => {
      let displayText = text
      const cleanHref = href.trim()
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
      const targetUrl = cleanHref.startsWith('/uploads/') ? `${API_URL}${cleanHref}` : cleanHref

      // If the link text is just a raw uploaded path or URL, display a clean short link
      if (text.includes('/uploads/') || (text.startsWith('http') && text.includes('/uploads/'))) {
        displayText = '🖼️ View Uploaded Image ↗'
      }
      return `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700 font-medium underline decoration-primary-500/30 underline-offset-4">${displayText}</a>`
    })

    // Auto-link standalone uploaded image paths (e.g. /uploads/questions/... or http.../uploads/...) that are not inside quotes or tags
    s = s.replace(/(^|[\s(])((?:https?:\/\/[^\s<)]+)?\/uploads\/[^\s<)]+\.(?:png|jpe?g|gif|webp|svg|bmp))(?=[\s)]|$)/gi, (_match, prefix, path) => {
      const cleanPath = path.trim()
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
      const targetUrl = cleanPath.startsWith('/uploads/') ? `${API_URL}${cleanPath}` : cleanPath
      return `${prefix}<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700 font-medium underline inline-flex items-center gap-1">🖼️ View Uploaded Image ↗</a>`
    })

    // Restore protected inline code
    s = s.replace(/__INLINE_CODE_(\d+)__/g, (_m, idx) => {
      const code = inlineCodes[Number(idx)] || ''
      return `<code class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">${code}</code>`
    })

    return s
  }

  const renderMarkdown = (md: string) => {
    // Block Math
    let processedMd = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, eq) => {
      try {
        return `<div class="my-4 overflow-x-auto text-center">${katex.renderToString(eq, { displayMode: true, throwOnError: false })}</div>`
      } catch {
        return `$$${eq}$$`
      }
    })

    const lines = processedMd.split('\n')
    const out: string[] = []
    let i = 0

    const buildTable = (rows: string[]) => {
      const isSep = (l: string) => /^\|[-:|\s]+\|$/.test(l.trim())
      const data = rows.filter(r => !isSep(r))
      if (!data.length) return ''
      const cols = (row: string) => row.split('|').slice(1, -1).map(c => c.trim())
      const [hdr, ...body] = data
      const ths = cols(hdr).map(h => `<th class="px-4 py-2 border border-slate-200 bg-slate-50 font-bold text-left text-sm">${inlineHTML(h)}</th>`).join('')
      const trs = body.map(r =>
        `<tr>${cols(r).map(c => `<td class="px-4 py-2 border border-slate-100 text-sm">${inlineHTML(c)}</td>`).join('')}</tr>`
      ).join('')
      return `<div class="overflow-x-auto my-6 rounded-lg border border-slate-200"><table class="w-full border-collapse bg-white">${ths ? `<thead><tr>${ths}</tr></thead>` : ''}<tbody>${trs}</tbody></table></div>`
    }

    while (i < lines.length) {
      const raw = lines[i]
      const t = raw.trim()

      if (t === '') { i++; continue }

      // Table
      if (t.startsWith('|') && i + 1 < lines.length && /^\|[-:|\s]+\|$/.test(lines[i + 1].trim())) {
        const tbl: string[] = []
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tbl.push(lines[i])
          i++
        }
        out.push(buildTable(tbl))
        continue
      }

      // Headings
      if (t.startsWith('# ')) { out.push(`<h1 class="text-2xl font-bold mt-6 mb-4">${inlineHTML(t.slice(2))}</h1>`); i++; continue }
      if (t.startsWith('## ')) { out.push(`<h2 class="text-xl font-bold mt-5 mb-3">${inlineHTML(t.slice(3))}</h2>`); i++; continue }
      if (t.startsWith('### ')) { out.push(`<h3 class="text-lg font-bold mt-4 mb-2">${inlineHTML(t.slice(4))}</h3>`); i++; continue }

      // Code Block
      if (t.startsWith('```')) {
        let code = []
        i++
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          code.push(lines[i])
          i++
        }
        
        // Single-pass tokenizer so strings and generated HTML are never re-scanned or broken
        const highlightCodeBlock = (blockText: string): string => {
          const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|void|null|undefined|true|false)\b)|(\b(?:int|str|bool|float|double|type|interface|enum|extends|implements|public|private|static|protected|any|unknown|never|readonly|keyof|String|Integer|Boolean|char|Long)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())/g;

          let lastIndex = 0;
          let match: RegExpExecArray | null;
          const parts: string[] = [];

          while ((match = tokenRegex.exec(blockText)) !== null) {
            if (match.index > lastIndex) {
              parts.push(esc(blockText.slice(lastIndex, match.index)));
            }
            lastIndex = tokenRegex.lastIndex;

            const [raw, comment, str, kw1, kw2, num, fn] = match;
            if (comment) {
              parts.push(`<span class="tok-comment text-[#5c6370] italic">${esc(comment)}</span>`);
            } else if (str) {
              parts.push(`<span class="tok-string text-[#98c379]">${esc(str)}</span>`);
            } else if (kw1) {
              parts.push(`<span class="tok-kw text-[#c678dd]">${esc(kw1)}</span>`);
            } else if (kw2) {
              parts.push(`<span class="tok-kw text-[#61afef]">${esc(kw2)}</span>`);
            } else if (num) {
              parts.push(`<span class="tok-num text-[#d19a66]">${esc(num)}</span>`);
            } else if (fn) {
              parts.push(`<span class="tok-fn text-[#e5c07b]">${esc(fn)}</span>`);
            } else {
              parts.push(esc(raw));
            }
          }
          if (lastIndex < blockText.length) {
            parts.push(esc(blockText.slice(lastIndex)));
          }
          return parts.join('');
        };

        const highlightedCode = highlightCodeBlock(code.join('\n'))

        out.push(`<pre class="bg-[#282c34] text-[#abb2bf] p-6 rounded-2xl font-mono text-[13px] my-6 overflow-x-auto border border-black/20 shadow-2xl leading-relaxed antialiased"><code>${highlightedCode}</code></pre>`)
        i++
        continue
      }

      // Callouts (custom ::: syntax)
      if (t.startsWith(':::')) {
        const type = t.slice(3).toLowerCase()
        let body = []
        i++
        while (i < lines.length && !lines[i].trim().startsWith(':::')) {
          body.push(lines[i])
          i++
        }
        const colors: any = {
          info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-200',
          note: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-200',
          warning: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200',
          tip: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200',
        }
        const icons: any = { info: 'ℹ️', note: '💡', warning: '⚠️', tip: '✅' }
        const c = colors[type] || 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-white/10 dark:text-white'
        const icon = icons[type] || '📝'
        out.push(`<div class="p-4 rounded-xl border-l-4 my-6 shadow-sm ${c}">
          <div class="font-bold flex items-center gap-2 mb-2 uppercase text-[10px] tracking-widest opacity-80">${icon} ${type}</div>
          <div class="text-sm leading-relaxed">${renderMarkdown(body.join('\n'))}</div>
        </div>`)
        i++
        continue
      }

      // Unordered list
      if (/^[-*] /.test(t)) {
        const items: string[] = []
        while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
          items.push(lines[i].trim().slice(2))
          i++
        }
        const lis = items.map(x => `<li class="ml-4">${inlineHTML(x)}</li>`).join('')
        out.push(`<ul class="list-disc list-inside mb-4 space-y-1">${lis}</ul>`)
        continue
      }

      // Ordered list
      if (/^\d+\. /.test(t)) {
        const items: string[] = []
        while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\. /, ''))
          i++
        }
        const lis = items.map(x => `<li class="ml-4">${inlineHTML(x)}</li>`).join('')
        out.push(`<ol class="list-decimal list-inside mb-4 space-y-1">${lis}</ol>`)
        continue
      }

      // Default paragraph
      out.push(`<p class="mb-4 leading-relaxed">${inlineHTML(t)}</p>`)
      i++
    }
    return out.join('')
  }

  return (
    <div 
      className={`prose dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(content)) }}
    />
  )
}
