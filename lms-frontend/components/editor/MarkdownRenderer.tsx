import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

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
    
    // Inline Math
    s = s.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (match, prefix, eq) => {
      try {
        const rendered = katex.renderToString(eq, { throwOnError: false })
        return prefix + rendered
      } catch {
        return match
      }
    })

    s = s.replace(/==(.*?)==/g, '<mark class="bg-yellow-200 text-black px-1 rounded">$1</mark>')
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>')
    s = s.replace(/~~(.*?)~~/g, '<del>$1</del>')
    s = s.replace(/`([^`]+?)`/g, '<code class="bg-slate-800 text-blue-300 px-1 rounded font-mono text-sm">$1</code>')
    s = s.replace(/!\[(.*?)\]\s?\(?([^)]+?)\)?\s*$/gm, '<img src="$2" alt="$1" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-lg my-2 shadow-sm" />')
    s = s.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" referrerPolicy="no-referrer" class="max-w-full h-auto rounded-lg my-2 shadow-sm" />')
    s = s.replace(/\[(.*?)\]\s?\(?([^)\s]+)\)?/g, '<a href="$2" target="_blank" class="text-primary-600 hover:text-primary-700 font-medium underline decoration-primary-500/30 underline-offset-4">$1</a>')
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
        
        const highlight = (line: string): string => {
          let s = esc(line)
          // Comments
          s = s.replace(/(\/\/.*$)/g, '<span class="tok-comment">$1</span>')
          s = s.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
          // Strings
          s = s.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="tok-string">$1</span>')
          // Keywords 1
          s = s.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|void|null|undefined|true|false)\b/g,
            '<span class="tok-kw text-[#c678dd]">$1</span>')
          // Keywords 2 (Types/Keywords)
          s = s.replace(/\b(int|str|bool|float|double|type|interface|enum|extends|implements|public|private|static|protected|any|unknown|never|readonly|keyof|typeof)\b/g,
            '<span class="tok-kw text-[#61afef]">$1</span>')
          // Numbers
          s = s.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num text-[#d19a66]">$1</span>')
          // Functions
          s = s.replace(/(\w+)(?=\()/g, '<span class="tok-fn text-[#e5c07b]">$1</span>')
          // Built-ins or Object keys could be added too
          return s
        }

        const highlightedCode = code.map(l => highlight(l)).join('\n')

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
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  )
}
