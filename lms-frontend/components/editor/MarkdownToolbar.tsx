import React from 'react'

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

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--bg-surface)] border border-[var(--border)] border-b-0 rounded-t-xl overflow-x-auto shadow-sm">
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
      <button type="button" onClick={() => insertText('$$ ', ' $$', 'formula')} className="tb-btn" title="Math System">∑</button>
      
      <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />

      {/* Media */}
      <button type="button" onClick={() => insertText('[', '](https://)', 'Link Text')} className="tb-btn text-[14px]" title="Add Link">🔗</button>
      <button type="button" onClick={() => fileInputRef.current?.click()} className="tb-btn text-[14px] bg-indigo-50 text-indigo-600 border-indigo-200" title="Upload Image">🖼️</button>

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
