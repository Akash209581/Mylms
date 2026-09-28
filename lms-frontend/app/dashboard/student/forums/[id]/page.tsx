'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { toast } from '@/lib/toast'
import { EmptyState, PageHeader } from '@/components/ui'
import { ArrowLeft, CheckCircle2, Eye, Heart, Loader2, MessageCircle, SearchX, Send } from 'lucide-react'
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

export default function ForumThreadPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
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
    const data = await getForumPost(id).catch(() => null)
    setPost(data)
    setLoading(false)
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      const result = await createReply(id, replyContent)
      if (result?.id) {
        setReplyContent('')
        toast.success('Reply posted')
        await loadPost()
      } else {
        toast.error('Your reply could not be posted.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
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

  const avatar = (person: any, size = 36) => (
    <span className="ui-avatar overflow-hidden" style={{ width: size, height: size }}>
      {person?.profilePicture ? <img src={person.profilePicture} alt="" className="w-full h-full object-cover" /> : getInitials(person?.name)}
    </span>
  )

  const shell = (content: React.ReactNode) => (
    <div className="portal-page">
      <StudentReferenceShell active="discussions" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <div className="max-w-4xl">
          <Link href="/dashboard/student/forums" className="ui-back"><ArrowLeft aria-hidden="true" /> All discussions</Link>
          {content}
        </div>
      </main>
    </div>
  )

  if (loading) return shell(
    <div className="grid gap-4"><div className="ui-skeleton h-56" /><div className="ui-skeleton h-28" /><div className="ui-skeleton h-28" /></div>
  )

  if (!post) return shell(
    <EmptyState icon={SearchX} title="Discussion not found">It may have been removed by a moderator.</EmptyState>
  )

  const replies = post.replies || []

  return shell(
    <>
      <article className="ui-card ui-card-accent mb-8" style={{ padding: 32 }}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="ui-badge is-gold no-dot">{post.category || 'Discussion'}</span>
          {post.tags?.map((tag: string, i: number) => <span key={i} className="ui-badge is-neutral no-dot" style={{ textTransform: 'none', letterSpacing: 0 }}>#{tag}</span>)}
        </div>
        <h1 className="font-display text-3xl font-semibold role-text-primary leading-tight">{post.title}</h1>

        <div className="flex flex-wrap items-center gap-3 mt-5 pb-5 border-b border-[var(--border)]">
          <div className="ui-person">
            {avatar(post.author, 40)}
            <div><strong>{post.author?.name || 'Anonymous'}</strong><small>{post.author?.collegeName || 'Student'} · {timeAgo(post.createdAt)}</small></div>
          </div>
          <ul className="ui-meta ml-auto">
            <li><Eye /> {post.viewsCount ?? 0} views</li>
            <li><MessageCircle /> {replies.length} replies</li>
          </ul>
        </div>

        <div className="role-text-secondary whitespace-pre-wrap leading-7 mt-5 text-[15px]">{post.content}</div>

        <div className="flex gap-2 mt-6">
          <button onClick={handleLikePost} disabled={likedPost} aria-pressed={likedPost} className={`ui-btn ui-btn-sm ${likedPost ? 'ui-btn-danger' : 'ui-btn-secondary'}`}>
            <Heart aria-hidden="true" fill={likedPost ? 'currentColor' : 'none'} /> {post.likesCount ?? 0}
          </button>
          <button onClick={() => document.getElementById('reply-box')?.focus()} className="ui-btn ui-btn-secondary ui-btn-sm"><MessageCircle aria-hidden="true" /> Reply</button>
        </div>
      </article>

      <section className="mb-8">
        <h2 className="ui-section-title mb-4">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</h2>
        {replies.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No replies yet">Be the first to respond.</EmptyState>
        ) : (
          <div className="grid gap-3">
            {replies.map((reply: any) => (
              <div key={reply.id} className="ui-card p-5" style={reply.isAccepted ? { borderLeft: '3px solid var(--success)' } : undefined}>
                {reply.isAccepted && <p className="flex items-center gap-1.5 mb-3 text-xs font-semibold tracking-wider uppercase text-[var(--success)]"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Accepted answer</p>}
                <div className="flex items-start gap-3">
                  {avatar(reply.author, 34)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm"><strong className="role-text-primary">{reply.author?.name || 'Anonymous'}</strong> <span className="role-text-muted ml-2 text-xs">{timeAgo(reply.createdAt)}</span></p>
                      <button onClick={() => handleLikeReply(reply.id)} disabled={likedReplies.has(reply.id)} aria-pressed={likedReplies.has(reply.id)} aria-label="Like reply" className={`ui-btn ui-btn-sm ${likedReplies.has(reply.id) ? 'ui-btn-danger' : 'ui-btn-ghost'}`} style={{ minHeight: 28, padding: '2px 8px' }}>
                        <Heart aria-hidden="true" fill={likedReplies.has(reply.id) ? 'currentColor' : 'none'} /> {reply.likesCount ?? 0}
                      </button>
                    </div>
                    <p className="role-text-secondary whitespace-pre-wrap text-sm leading-6 mt-1">{reply.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={handleReply} className="ui-card ui-card-pad grid gap-4">
        <h2 className="ui-section-title" style={{ fontSize: 18 }}>Add your reply</h2>
        {user && <div className="ui-person">{avatar(user, 30)}<small>Replying as <strong className="inline role-text-primary">{user.name}</strong></small></div>}
        <textarea
          id="reply-box"
          rows={5}
          placeholder="Share an answer or ask a follow-up question"
          value={replyContent}
          onChange={e => setReplyContent(e.target.value)}
          className="ui-textarea"
          aria-label="Reply"
        />
        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !replyContent.trim()} className="ui-btn ui-btn-primary">
            {submitting ? <><Loader2 className="animate-spin" aria-hidden="true" /> Posting…</> : <><Send aria-hidden="true" /> Post reply</>}
          </button>
        </div>
      </form>
    </>
  )
}
