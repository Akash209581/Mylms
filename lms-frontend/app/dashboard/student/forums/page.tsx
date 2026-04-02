'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getForumCategories, getForumPosts, getRecentPosts, createPost } from '@/lib/forumService'

const CATEGORIES = [
  { name: 'General Discussion', icon: '💬', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500' },
  { name: 'Data Structures & Algorithms', icon: '🧩', color: 'from-purple-500 to-indigo-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500' },
  { name: 'Machine Learning', icon: '🤖', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-500' },
  { name: 'Web Development', icon: '🌐', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500' },
  { name: 'Career Guidance', icon: '🚀', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500' },
  { name: 'Study Groups', icon: '📚', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-500' },
]

function timeAgo(date: string) {
  if (!date) return ''
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getInitials(name: string) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function ForumsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'browse' | 'recent' | 'create'>('browse')
  const [categories, setCategories] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Create post form state
  const [form, setForm] = useState({ title: '', content: '', category: 'General Discussion', tags: '' })
  const [formMsg, setFormMsg] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    loadData()
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [cats, recent] = await Promise.all([
      getForumCategories(),
      getRecentPosts(),
    ])
    setCategories(cats)
    setRecentPosts(Array.isArray(recent) ? recent : [])
    setLoading(false)
  }, [])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const data = await getForumPosts({ category: selectedCategory || undefined, search: search || undefined })
    setPosts(Array.isArray(data.posts) ? data.posts : [])
    setLoading(false)
  }, [selectedCategory, search])

  useEffect(() => {
    if (activeTab === 'browse' && selectedCategory) loadPosts()
  }, [selectedCategory, activeTab, loadPosts])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setFormMsg('Please fill in title and content.')
      return
    }
    setCreating(true)
    setFormMsg('')
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      const result = await createPost({ title: form.title, content: form.content, category: form.category, tags })
      if (result?.id) {
        setFormMsg('✅ Post created successfully!')
        setForm({ title: '', content: '', category: 'General Discussion', tags: '' })
        setTimeout(() => router.push(`/dashboard/student/forums/${result.id}`), 1200)
      } else {
        setFormMsg('❌ Failed to create post. Please try again.')
      }
    } catch {
      setFormMsg('❌ Something went wrong.')
    } finally {
      setCreating(false)
    }
  }

  const getCategoryMeta = (name: string) => CATEGORIES.find(c => c.name === name) || CATEGORIES[0]

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Sidebar role="STUDENT" />
      <Navbar title="Community Forums" />

      <main className="page-content pt-20 pb-12">
        {/* Hero Header */}
        <div className="relative mb-8 rounded-3xl overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="absolute inset-0 flex flex-col items-start justify-center px-10">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-1">Community Forums</h1>
              <p className="text-white/70 font-medium">Connect, discuss, and grow with your peers 🌍</p>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -right-4 bottom-0 w-32 h-32 bg-pink-500/20 rounded-full blur-xl" />
          </div>
        </div>

        {/* Search + Stats Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search discussions..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 transition-all shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSelectedCategory(null); loadPosts() } }}
            />
          </div>
          <button
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-bold rounded-2xl hover:opacity-90 hover:scale-105 transition-all shadow-lg shadow-[var(--accent)]/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--bg-raised)] rounded-2xl mb-8 w-fit">
          {(['browse', 'recent', 'create'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab === 'browse' ? '🗂 Browse' : tab === 'recent' ? '⏰ Recent' : '✍️ Create Post'}
            </button>
          ))}
        </div>

        {/* ─── Tab: Browse ─── */}
        {activeTab === 'browse' && !selectedCategory && (
          <div>
            <h2 className="text-xl font-black mb-6 text-[var(--text-primary)]">Browse by Category</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-40 rounded-3xl bg-[var(--bg-raised)] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CATEGORIES.map(cat => {
                  const apiCat = categories.find((c: any) => c.name === cat.name)
                  return (
                    <button
                      key={cat.name}
                      onClick={() => { setSelectedCategory(cat.name); setActiveTab('browse') }}
                      className={`text-left p-6 rounded-3xl border ${cat.bg} ${cat.border} hover:scale-[1.03] hover:shadow-xl transition-all group cursor-pointer`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                          {cat.icon}
                        </div>
                        <svg className={`w-5 h-5 ${cat.text} opacity-0 group-hover:opacity-100 transition-opacity`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <h3 className="font-black text-[var(--text-primary)] text-lg mb-1">{cat.name}</h3>
                      <div className="flex items-center gap-4 text-[var(--text-muted)] text-sm">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {apiCat?.postsCount ?? 0} posts
                        </span>
                        {apiCat?.lastActivity && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {timeAgo(apiCat.lastActivity)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Category Posts List ─── */}
        {activeTab === 'browse' && selectedCategory && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Categories
              </button>
              <span className="text-[var(--border-strong)]">›</span>
              <h2 className="font-black text-[var(--text-primary)] text-xl">{selectedCategory}</h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-[var(--bg-raised)] animate-pulse" />)}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">💭</p>
                <p className="text-[var(--text-muted)] font-medium">No discussions yet. Be the first to start one!</p>
                <button onClick={() => setActiveTab('create')} className="mt-4 px-6 py-3 bg-[var(--accent)] text-white font-bold rounded-2xl hover:opacity-90 transition-all">
                  Start a Discussion
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => {
                  const meta = getCategoryMeta(post.category)
                  return (
                    <Link key={post.id} href={`/dashboard/student/forums/${post.id}`}>
                      <div className="glass-card p-5 flex items-start gap-4 hover:scale-[1.01] cursor-pointer transition-all">
                        {/* Author Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {post.author?.profilePicture ? <img src={post.author.profilePicture} className="w-full h-full object-cover rounded-xl" /> : getInitials(post.author?.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {post.isPinned && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/20">📌 Pinned</span>}
                            <h3 className="font-bold text-[var(--text-primary)] truncate">{post.title}</h3>
                          </div>
                          <p className="text-[var(--text-muted)] text-sm line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                            <span>{post.author?.name}</span>
                            <span>{timeAgo(post.createdAt)}</span>
                            <span className="flex items-center gap-1">❤️ {post.likesCount}</span>
                            <span className="flex items-center gap-1">👁 {post.viewsCount}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Recent Posts ─── */}
        {activeTab === 'recent' && (
          <div>
            <h2 className="text-xl font-black mb-6">Recent Discussions</h2>
            {loading ? (
              <div className="space-y-4">{[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-[var(--bg-raised)] animate-pulse" />)}</div>
            ) : recentPosts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🌱</p>
                <p className="text-[var(--text-muted)]">No posts yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPosts.map(post => {
                  const meta = getCategoryMeta(post.category)
                  return (
                    <Link key={post.id} href={`/dashboard/student/forums/${post.id}`}>
                      <div className="glass-card p-5 flex items-start gap-4 hover:scale-[1.01] cursor-pointer transition-all">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {post.author?.profilePicture ? <img src={post.author.profilePicture} className="w-full h-full object-cover rounded-xl" /> : getInitials(post.author?.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${meta.bg} ${meta.text} border ${meta.border}`}>{post.category}</span>
                            <h3 className="font-bold text-[var(--text-primary)] truncate">{post.title}</h3>
                          </div>
                          <p className="text-[var(--text-muted)] text-sm line-clamp-1">{post.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                            <span className="font-medium">{post.author?.name}</span>
                            <span>{timeAgo(post.createdAt)}</span>
                            <span>❤️ {post.likesCount}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Create Post ─── */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8">
              <h2 className="text-2xl font-black mb-2">Start a Discussion</h2>
              <p className="text-[var(--text-muted)] mb-8 text-sm">Share your thoughts, ask questions, or help others in the community.</p>

              {formMsg && (
                <div className={`p-4 rounded-2xl mb-6 font-bold border ${formMsg.includes('✅') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {formMsg}
                </div>
              )}

              <form onSubmit={handleCreatePost} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  >
                    {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="What's your question or topic?"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Content</label>
                  <textarea
                    rows={8}
                    placeholder="Describe your question, share your thoughts, or provide context..."
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Tags <span className="normal-case font-normal">(comma-separated, optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. react, javascript, interview"
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-3.5 bg-[var(--accent)] text-white font-black rounded-2xl hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent)]/20"
                  >
                    {creating ? 'Publishing...' : '🚀 Publish Post'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="px-6 py-3.5 bg-[var(--bg-raised)] text-[var(--text-primary)] font-bold rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
