'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getForumPost, createReply, likePost, likeReply } from '@/lib/forumService'

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
  return name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const CATEGORY_COLORS: Record<string, string> = {
  'General Discussion': 'from-blue-500 to-cyan-500',
  'Data Structures & Algorithms': 'from-purple-500 to-indigo-500',
  'Machine Learning': 'from-pink-500 to-rose-500',
  'Web Development': 'from-emerald-500 to-teal-500',
  'Career Guidance': 'from-amber-500 to-orange-500',
  'Study Groups': 'from-violet-500 to-purple-600',
}

export default function ForumThreadPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyMsg, setReplyMsg] = useState('')
  const [likedPost, setLikedPost] = useState(false)
  const [likedReplies, setLikedReplies] = useState<Set<number>>(new Set())
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    loadPost()
  }, [id])

  const loadPost = async () => {
    setLoading(true)
    const data = await getForumPost(id)
    setPost(data)
    setLoading(false)
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    setSubmitting(true)
    setReplyMsg('')
    try {
      const result = await createReply(id, replyContent)
      if (result?.id) {
        setReplyContent('')
        setReplyMsg('✅ Reply posted!')
        await loadPost()
        setTimeout(() => setReplyMsg(''), 3000)
      } else {
        setReplyMsg('❌ Failed to post reply.')
      }
    } catch {
      setReplyMsg('❌ Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikePost = async () => {
    if (likedPost) return
    setLikedPost(true)
    const updated = await likePost(id)
    if (updated) setPost((prev: any) => ({ ...prev, likesCount: updated.likesCount }))
  }

  const handleLikeReply = async (replyId: number) => {
    if (likedReplies.has(replyId)) return
    setLikedReplies(prev => new Set(prev).add(replyId))
    await likeReply(replyId)
    await loadPost()
  }

  const gradientClass = post ? (CATEGORY_COLORS[post.category] || 'from-indigo-500 to-purple-500') : 'from-indigo-500 to-purple-500'

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Sidebar role="STUDENT" />
        <Navbar title="Forum Thread" />
        <main className="page-content pt-20">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="h-48 bg-[var(--bg-raised)] rounded-3xl animate-pulse" />
            <div className="h-32 bg-[var(--bg-raised)] rounded-3xl animate-pulse" />
            <div className="h-32 bg-[var(--bg-raised)] rounded-3xl animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Sidebar role="STUDENT" />
        <Navbar title="Forum Thread" />
        <main className="page-content pt-20 text-center">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-[var(--text-muted)] font-medium">Post not found.</p>
          <Link href="/dashboard/student/forums" className="mt-4 inline-block px-6 py-3 bg-[var(--accent)] text-white font-bold rounded-2xl">
            Back to Forums
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Sidebar role="STUDENT" />
      <Navbar title={post.title} />

      <main className="page-content pt-20 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
            <Link href="/dashboard/student/forums" className="hover:text-[var(--accent)] transition-colors font-medium">Forums</Link>
            <span>›</span>
            <span className="text-[var(--text-muted)]">{post.category}</span>
            <span>›</span>
            <span className="text-[var(--text-primary)] font-medium line-clamp-1">{post.title}</span>
          </div>

          {/* Main Post Card */}
          <div className="glass-card mb-6 overflow-hidden">
            {/* Category Banner */}
            <div className={`h-2 bg-gradient-to-r ${gradientClass}`} />

            <div className="p-8">
              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-2xl md:text-3xl font-black mb-6">{post.title}</h1>

              {/* Author Row */}
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-black shadow-lg`}>
                  {post.author?.profilePicture
                    ? <img src={post.author.profilePicture} className="w-full h-full object-cover rounded-2xl" alt="" />
                    : getInitials(post.author?.name)}
                </div>
                <div>
                  <p className="font-black text-[var(--text-primary)] text-sm">{post.author?.name || 'Anonymous'}</p>
                  <p className="text-[var(--text-muted)] text-xs">{post.author?.collegeName || 'Student'} • {timeAgo(post.createdAt)}</p>
                </div>
                <div className="ml-auto flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">👁 {post.viewsCount} views</span>
                  <span className="flex items-center gap-1.5">💬 {post.replies?.length || 0} replies</span>
                </div>
              </div>

              {/* Post Content */}
              <div className="prose prose-sm max-w-none text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap text-base border-t border-[var(--border)] pt-6">
                {post.content}
              </div>

              {/* Like Button */}
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-[var(--border)]">
                <button
                  onClick={handleLikePost}
                  disabled={likedPost}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    likedPost
                      ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                      : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20'
                  }`}
                >
                  ❤️ {post.likesCount} {likedPost ? 'Liked' : 'Like'}
                </button>
                <button
                  onClick={() => document.getElementById('reply-box')?.focus()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-text)] hover:border-[var(--accent)]/20 transition-all"
                >
                  💬 Reply
                </button>
              </div>
            </div>
          </div>

          {/* Replies Section */}
          <div className="mb-6">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <span>💬</span>
              {post.replies?.length || 0} Replies
            </h2>

            {post.replies?.length === 0 ? (
              <div className="text-center py-12 glass-card">
                <p className="text-4xl mb-3">🤫</p>
                <p className="text-[var(--text-muted)] font-medium">No replies yet. Be the first to respond!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {post.replies.map((reply: any, idx: number) => (
                  <div key={reply.id} className={`glass-card p-6 ${reply.isAccepted ? 'ring-2 ring-emerald-500/40' : ''}`}>
                    {reply.isAccepted && (
                      <div className="flex items-center gap-2 mb-3 text-emerald-500 text-xs font-black uppercase tracking-widest">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Accepted Answer
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      {/* Reply number */}
                      <span className="text-[var(--text-muted)] text-xs font-black w-6 mt-1 flex-shrink-0">#{idx + 1}</span>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                        {reply.author?.profilePicture
                          ? <img src={reply.author.profilePicture} className="w-full h-full object-cover rounded-xl" alt="" />
                          : getInitials(reply.author?.name)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-black text-sm text-[var(--text-primary)]">{reply.author?.name || 'Anonymous'}</span>
                            <span className="text-[var(--text-muted)] text-xs ml-3">{timeAgo(reply.createdAt)}</span>
                          </div>
                          <button
                            onClick={() => handleLikeReply(reply.id)}
                            disabled={likedReplies.has(reply.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              likedReplies.has(reply.id)
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-[var(--bg-raised)] text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500'
                            }`}
                          >
                            ❤️ {reply.likesCount}
                          </button>
                        </div>
                        <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap text-sm">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reply Form */}
          <div className="glass-card p-8">
            <h3 className="text-lg font-black mb-4">Add Your Reply</h3>

            {replyMsg && (
              <div className={`p-3 rounded-xl mb-4 text-sm font-bold ${replyMsg.includes('✅') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                {replyMsg}
              </div>
            )}

            <form onSubmit={handleReply} className="space-y-4">
              {/* Author Info */}
              {user && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs">
                    {getInitials(user.name)}
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">Replying as {user.name}</span>
                </div>
              )}
              <textarea
                id="reply-box"
                rows={5}
                placeholder="Share your thoughts, answer, or ask a follow-up question..."
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none transition-all"
              />
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting || !replyContent.trim()}
                  className="px-8 py-3 bg-[var(--accent)] text-white font-black rounded-2xl hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-40 shadow-lg shadow-[var(--accent)]/20"
                >
                  {submitting ? 'Posting...' : '💬 Post Reply'}
                </button>
                <Link
                  href="/dashboard/student/forums"
                  className="px-6 py-3 bg-[var(--bg-raised)] text-[var(--text-primary)] font-bold rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all inline-flex items-center"
                >
                  ← Back to Forums
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
