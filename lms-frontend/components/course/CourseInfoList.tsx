import MarkdownRenderer from '@/components/editor/MarkdownRenderer'

/** Authors enter one item per line; tolerate pasted Markdown list markers. */
export function courseInfoItems(content: string) {
  return content.split(/\r?\n/).map(line => line.trim().replace(/^(?:[-*+•]\s+|\d+[.)]\s+)/, '')).filter(Boolean)
}

export default function CourseInfoList({ content }: { content: string }) {
  return <ul className="space-y-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
    {courseInfoItems(content).map((item, index) => <li key={index} className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
      <div className="min-w-0 flex-1 break-words"><MarkdownRenderer content={item} /></div>
    </li>)}
  </ul>
}
