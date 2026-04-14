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
    s = s.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2" />')
    s = s.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-primary-500 hover:underline">$1</a>')
    return s
  }

  const renderMarkdown = (md: string) => {
    // Block Math
    let processedMd = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, eq) => {
      try {
        return `<div class="my-4 overflow-x-auto">${katex.renderToString(eq, { displayMode: true, throwOnError: false })}</div>`
      } catch {
        return `$$${eq}$$`
      }
    })

    const lines = processedMd.split('\n')
    const out: string[] = []
    let i = 0

    while (i < lines.length) {
      const raw = lines[i]
      const t = raw.trim()

      if (t === '') { i++; continue }

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
        out.push(`<pre class="bg-slate-900 text-gray-100 p-4 rounded-xl font-mono text-sm my-4 overflow-x-auto border border-white/10">${esc(code.join('\n'))}</pre>`)
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
          info: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
          note: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200',
          warning: 'bg-red-500/10 border-red-500/30 text-red-200',
        }
        const icons: any = { info: 'ℹ️', note: '💡', warning: '⚠️' }
        const c = colors[type] || 'bg-slate-800 border-white/10 text-white'
        const icon = icons[type] || '📝'
        out.push(`<div class="p-4 rounded-xl border-l-4 my-4 ${c}">
          <div class="font-bold flex items-center gap-2 mb-1 uppercase text-xs tracking-widest">${icon} ${type}</div>
          <div>${renderMarkdown(body.join('\n'))}</div>
        </div>`)
        i++
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
      className={`prose prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  )
}
