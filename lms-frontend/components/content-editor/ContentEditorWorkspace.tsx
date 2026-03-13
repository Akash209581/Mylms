'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { Cell } from '@/components/editor/LessonEditor'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { useRouter } from 'next/navigation'

/* ── Dynamically import the cell editor (browser-only) ── */
const LessonEditor = dynamic(
  () => import('@/components/editor/LessonEditor'),
  { ssr: false, loading: () => <div className="nb-editor animate-pulse min-h-[400px]" /> }
)

/* ───────────────────────────────────────────────────────
   Types
─────────────────────────────────────────────────────── */
interface ContentDoc {
  id: string
  title: string
  category: 'course' | 'exam-prep' | 'notes' | 'other'
  cells: Cell[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'ce_documents'
const CATEGORY_LABELS: Record<ContentDoc['category'], string> = {
  'course': '📚 Course',
  'exam-prep': '📝 Exam Prep',
  'notes': '🗒️ Notes',
  'other': '📄 Other',
}
const CATEGORY_COLORS: Record<ContentDoc['category'], string> = {
  'course': 'bg-indigo-100 text-indigo-700',
  'exam-prep': 'bg-amber-100 text-amber-700',
  'notes': 'bg-emerald-100 text-emerald-700',
  'other': 'bg-slate-100 text-slate-600',
}

function genId() { return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function loadDocs(): ContentDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveDocs(docs: ContentDoc[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
}

/* ───────────────────────────────────────────────────────
   Component
─────────────────────────────────────────────────────── */
export default function ContentEditorWorkspace({ role }: { role: string }) {
  const router = useRouter()
  const [docs, setDocs] = useState<ContentDoc[]>([])
  const [activeDoc, setActiveDoc] = useState<ContentDoc | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [saveFlash, setSaveFlash] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  /* ── Auth guard ── */
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    const u = JSON.parse(stored)
    const allowed = ['INSTRUCTOR', 'ADMIN', 'SUPERADMIN']
    if (!allowed.includes(u.role)) router.push(`/dashboard/${u.role.toLowerCase()}`)
    const loaded = loadDocs()
    setDocs(loaded)
  }, [])

  /* ── Create new document ── */
  const createDoc = (category: ContentDoc['category'] = 'other') => {
    const doc: ContentDoc = {
      id: genId(),
      title: 'Untitled Document',
      category,
      cells: [{ id: `cell-${Date.now()}`, type: 'text', content: '' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [doc, ...docs]
    setDocs(updated)
    saveDocs(updated)
    setActiveDoc(doc)
  }

  /* ── Select existing doc ── */
  const openDoc = (doc: ContentDoc) => setActiveDoc(doc)

  /* ── Delete doc ── */
  const deleteDoc = (id: string) => {
    if (!confirm('Delete this document?')) return
    const updated = docs.filter(d => d.id !== id)
    setDocs(updated)
    saveDocs(updated)
    if (activeDoc?.id === id) setActiveDoc(null)
  }

  /* ── Save cells (called by LessonEditor's debounced save) ── */
  const handleSave = async (content: Record<string, any>) => {
    if (!activeDoc) return
    const updatedDoc: ContentDoc = {
      ...activeDoc,
      cells: content.cells ?? activeDoc.cells,
      updatedAt: new Date().toISOString(),
    }
    setActiveDoc(updatedDoc)
    const updated = docs.map(d => d.id === updatedDoc.id ? updatedDoc : d)
    setDocs(updated)
    saveDocs(updated)
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 2000)
  }

  /* ── Save title ── */
  const commitTitle = () => {
    if (!activeDoc) return
    const trimmed = titleDraft.trim() || 'Untitled Document'
    const updatedDoc = { ...activeDoc, title: trimmed, updatedAt: new Date().toISOString() }
    setActiveDoc(updatedDoc)
    const updated = docs.map(d => d.id === updatedDoc.id ? updatedDoc : d)
    setDocs(updated)
    saveDocs(updated)
    setEditingTitle(false)
  }

  /* ── Change category ── */
  const changeCategory = (cat: ContentDoc['category']) => {
    if (!activeDoc) return
    const updatedDoc = { ...activeDoc, category: cat, updatedAt: new Date().toISOString() }
    setActiveDoc(updatedDoc)
    const updated = docs.map(d => d.id === updatedDoc.id ? updatedDoc : d)
    setDocs(updated)
    saveDocs(updated)
  }

  /* ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={role} />
      <Navbar title="Content Editor" />

      <main className="page-content">
        {/* ── Hero ── */}
        <div
          className="hero-section hero-dark mb-6"
          style={{ background: 'linear-gradient(135deg,#4338ca,#6d28d9)' }}
        >
          <div className="relative z-10">
            <p className="text-white/60 text-sm mb-1">Content Creation ✏️</p>
            <h1 className="text-3xl font-bold text-white mb-1">Content Editor</h1>
            <p className="text-white/70 text-sm">
              Create standalone content — course material, exam prep, notes, or anything else.
              Cell-based, auto-saved locally.
            </p>
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── Left panel: document list ── */}
          <div className="w-72 flex-shrink-0">
            <div className="glass-card p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                My Documents
              </p>

              {/* New doc quick-create */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(Object.entries(CATEGORY_LABELS) as [ContentDoc['category'], string][]).map(
                  ([cat, label]) => (
                    <button
                      key={cat}
                      onClick={() => createDoc(cat)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border border-transparent hover:border-indigo-300 transition-all ${CATEGORY_COLORS[cat]}`}
                      title={`New ${label} document`}
                    >
                      + {label}
                    </button>
                  )
                )}
              </div>

              {docs.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6 italic">
                  No documents yet.<br />Click a button above to create one.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                  {docs.map(doc => (
                    <li key={doc.id}>
                      <button
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${activeDoc?.id === doc.id
                            ? 'bg-indigo-600 text-white shadow'
                            : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        onClick={() => openDoc(doc)}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-medium text-sm leading-tight break-all line-clamp-2">
                            {doc.title}
                          </span>
                          <button
                            className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1 rounded ${activeDoc?.id === doc.id ? 'text-red-200 hover:text-red-100' : 'text-red-400 hover:text-red-600'
                              }`}
                            title="Delete"
                            onClick={e => { e.stopPropagation(); deleteDoc(doc.id) }}
                          >
                            ✕
                          </button>
                        </div>
                        <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${activeDoc?.id === doc.id
                            ? 'bg-white/20 text-white'
                            : CATEGORY_COLORS[doc.category]
                          }`}>
                          {CATEGORY_LABELS[doc.category]}
                        </span>
                        <p className={`text-[10px] mt-0.5 ${activeDoc?.id === doc.id ? 'text-white/60' : 'text-slate-400'}`}>
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Right panel: editor ── */}
          <div className="flex-1 min-w-0">
            {!activeDoc ? (
              /* Empty state */
              <div className="glass-card p-16 text-center">
                <div className="text-6xl mb-4">✏️</div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">No document open</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Select a document from the left or create a new one.
                </p>
                <button onClick={() => createDoc('other')} className="btn-primary">
                  + New Document
                </button>
              </div>
            ) : (
              <div className="glass-card p-6 space-y-4">

                {/* ── Document header ── */}
                <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
                  <div className="flex-1 min-w-0">
                    {/* Editable title */}
                    {editingTitle ? (
                      <input
                        ref={titleRef}
                        autoFocus
                        value={titleDraft}
                        onChange={e => setTitleDraft(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={e => e.key === 'Enter' && commitTitle()}
                        className="w-full text-2xl font-bold text-slate-900 bg-transparent border-b-2 border-indigo-500 outline-none pb-1 mb-1"
                        placeholder="Document title..."
                      />
                    ) : (
                      <h1
                        className="text-2xl font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => { setTitleDraft(activeDoc.title); setEditingTitle(true) }}
                        title="Click to rename"
                      >
                        {activeDoc.title}
                        <span className="ml-2 text-slate-300 text-lg">✎</span>
                      </h1>
                    )}

                    {/* Category + last saved */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <select
                        value={activeDoc.category}
                        onChange={e => changeCategory(e.target.value as ContentDoc['category'])}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium border-none outline-none cursor-pointer ${CATEGORY_COLORS[activeDoc.category]}`}
                      >
                        {(Object.entries(CATEGORY_LABELS) as [ContentDoc['category'], string][]).map(
                          ([cat, label]) => (
                            <option key={cat} value={cat}>{label}</option>
                          )
                        )}
                      </select>
                      <span className={`text-xs font-medium transition-all ${saveFlash ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {saveFlash ? '✓ Saved' : `Last saved ${new Date(activeDoc.updatedAt).toLocaleTimeString()}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Notebook cell editor ── */}
                <LessonEditor
                  lessonId={0}
                  initialContent={{ type: 'notebook', cells: activeDoc.cells }}
                  onSave={handleSave}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
