'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock3, Flame, Loader2, MessageCircle, MessagesSquare, PenLine, Plus, Search, UserRound, X } from 'lucide-react'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { createPost, getForumCategories, getRecentPosts } from '@/lib/forumService'
import { toast } from '@/lib/toast'
import { EmptyState, Loading, PageHeader, initials } from '@/components/ui'

const ago = (value?: string) => {
  if (!value) return ''
  const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3600000)
  return hours < 1 ? 'just now' : hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
}
const replies = (post: any) => Number(post.repliesCount ?? post.commentsCount ?? 0)

type Tab = 'recent' | 'trending' | 'mine'

export default function ForumsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [tab, setTab] = useState<Tab>('recent')
  const [composing, setComposing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [me, setMe] = useState<{ id?: number; name?: string } | null>(null)
  const [form, setForm] = useState({ title: '', content: '', category: 'General Discussion' })

  useEffect(() => {
    try { setMe(JSON.parse(localStorage.getItem('user') || 'null')) } catch { /* anonymous */ }
    Promise.all([getForumCategories().catch(() => []), getRecentPosts().catch(() => [])])
      .then(([cats, recent]) => {
        setCategories(Array.isArray(cats) ? cats : [])
        setPosts(Array.isArray(recent) ? recent : [])
      })
      .finally(() => setLoading(false))
  }, [])

  const visiblePosts = useMemo(() => {
    const q = search.toLowerCase()
    let list = posts.filter(post =>
      (!category || post.category === category) &&
      `${post.title} ${post.content} ${post.category} ${post.author?.name || ''}`.toLowerCase().includes(q))
    if (tab === 'mine') list = list.filter(post => (post.author?.id ?? post.authorId) === me?.id)
    if (tab === 'trending') list = [...list].sort((a, b) => replies(b) - replies(a))
    else list = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    return list
  }, [posts, search, category, tab, me])

  const contributors = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    posts.forEach(post => {
      const name = post.author?.name || 'Community member'
      counts.set(name, { name, count: (counts.get(name)?.count || 0) + 1 })
    })
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [posts])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    setCreating(true)
    try {
      const post = await createPost({ ...form, tags: [] })
      if (post?.id) router.push(`/dashboard/student/forums/${post.id}`)
    } catch (error: any) {
      toast.error(error?.message || 'Your post could not be published. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const categoryOptions = categories.length ? categories : [{ name: 'General Discussion' }]

  return (
    <div className="portal-page">
      <StudentReferenceShell active="discussions" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <PageHeader
          eyebrow="Community"
          title="Discussions"
          description="Ask questions, share what you've learned and help your classmates."
          actions={<button className="ui-btn ui-btn-primary" onClick={() => setComposing(true)}><Plus aria-hidden="true" /> New discussion</button>}
        />

        {composing && (
          <form onSubmit={submit} className="ui-card ui-card-pad ui-card-accent mb-6 grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="ui-section-title">Start a discussion</h2>
              <button type="button" className="ui-icon-btn" aria-label="Close" onClick={() => setComposing(false)}><X /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_240px]">
              <div className="ui-field">
                <label className="ui-label" htmlFor="post-title">Title</label>
                <input id="post-title" className="ui-input" placeholder="What would you like to discuss?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="ui-field">
                <label className="ui-label" htmlFor="post-category">Category</label>
                <select id="post-category" className="ui-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categoryOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="post-body">Details</label>
              <textarea id="post-body" className="ui-textarea" rows={5} placeholder="Give enough context for others to help." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setComposing(false)}>Cancel</button>
              <button className="ui-btn ui-btn-primary" disabled={creating}>{creating ? <><Loader2 className="animate-spin" aria-hidden="true" /> Publishing…</> : <><PenLine aria-hidden="true" /> Publish</>}</button>
            </div>
          </form>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
          <section className="min-w-0">
            <div className="ui-toolbar">
              <label className="ui-input-icon">
                <Search aria-hidden="true" />
                <input className="ui-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discussions or people" aria-label="Search discussions" />
              </label>
              <div className="ui-tabs" role="tablist" aria-label="Sort discussions">
                {([['recent', 'Recent', Clock3], ['trending', 'Most replies', Flame], ['mine', 'My posts', UserRound]] as const).map(([id, label, Icon]) => (
                  <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="ui-tab"><Icon className="w-4 h-4" aria-hidden="true" /> {label}</button>
                ))}
              </div>
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                <button onClick={() => setCategory('')} className={`ui-badge no-dot cursor-pointer ${!category ? 'is-accent' : 'is-neutral'}`} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13, padding: '5px 12px' }}>All topics</button>
                {categories.map(c => (
                  <button key={c.id || c.name} onClick={() => setCategory(c.name === category ? '' : c.name)} className={`ui-badge no-dot cursor-pointer ${category === c.name ? 'is-accent' : 'is-neutral'}`} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13, padding: '5px 12px' }}>
                    {c.name} <span className="opacity-70">{c.postsCount || 0}</span>
                  </button>
                ))}
              </div>
            )}

            {loading ? <Loading label="Loading discussions" /> : visiblePosts.length ? (
              <ul className="ui-table-wrap divide-y divide-[var(--border)]" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {visiblePosts.map(post => (
                  <li key={post.id}>
                    <Link href={`/dashboard/student/forums/${post.id}`} className="flex gap-4 p-5 hover:bg-[var(--bg-raised)] transition-colors no-underline">
                      <span className="ui-avatar" aria-hidden="true">{initials(post.author?.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold role-text-primary">{post.title}</p>
                        <p className="text-sm role-text-muted line-clamp-2 mt-1">{post.content}</p>
                        <ul className="ui-meta mt-2" style={{ fontSize: 12 }}>
                          <li><strong>{post.author?.name || 'Community member'}</strong></li>
                          <li>{post.category || 'Discussion'}</li>
                          <li>{ago(post.createdAt)}</li>
                        </ul>
                      </div>
                      <span className="flex items-center gap-1.5 self-center shrink-0 text-sm role-text-muted"><MessageCircle className="w-4 h-4" aria-hidden="true" /> {replies(post)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={MessagesSquare} title={tab === 'mine' ? "You haven't posted yet" : 'No discussions found'} action={<button className="ui-btn ui-btn-primary" onClick={() => setComposing(true)}><Plus aria-hidden="true" /> Start a discussion</button>}>
                {search || category ? 'Try a different search or topic.' : 'Be the first to start a conversation.'}
              </EmptyState>
            )}
          </section>

          <aside className="grid gap-5">
            <section className="ui-card ui-card-pad">
              <h2 className="ui-section-title" style={{ fontSize: 17 }}>At a glance</h2>
              <dl className="ui-kv mt-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div><dt>Discussions</dt><dd>{posts.length}</dd></div>
                <div><dt>Topics</dt><dd>{categories.length}</dd></div>
              </dl>
            </section>
            {contributors.length > 0 && (
              <section className="ui-card ui-card-pad">
                <h2 className="ui-section-title" style={{ fontSize: 17 }}>Top contributors</h2>
                <ol className="grid gap-3 mt-4" style={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
                  {contributors.map((c, i) => (
                    <li key={c.name} className="ui-person">
                      <span className="w-4 text-sm font-semibold role-text-muted ui-num">{i + 1}</span>
                      <span className="ui-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(c.name)}</span>
                      <div className="min-w-0"><strong className="truncate">{c.name}</strong><small>{c.count} post{c.count === 1 ? '' : 's'}</small></div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
