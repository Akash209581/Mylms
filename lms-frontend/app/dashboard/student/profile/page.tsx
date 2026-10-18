'use client'

import { useEffect, useState } from 'react'
import {
  BookOpen, CalendarDays, CheckCircle2, Circle, Clock3, Code2, ExternalLink, Flame, Github, Globe, GraduationCap, Landmark,
  Linkedin, Loader2, Mail, MapPin, Pencil, Phone, RefreshCw, Save, Trophy, X, Zap
} from 'lucide-react'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { Loading, PageHeader, Stat, initials } from '@/components/ui'

const EDITABLE = [
  'name', 'mobileNumber', 'state', 'country', 'bio',
  'githubUrl', 'linkedInUrl', 'portfolioUrl',
  'leetcodeUsername', 'codeforcesUsername', 'codechefUsername', 'hackerrankUsername', 'hackerearthUsername'
] as const
type Editable = typeof EDITABLE[number]
const URL_FIELDS: Editable[] = ['githubUrl', 'linkedInUrl', 'portfolioUrl']

export default function StudentProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [form, setForm] = useState<Record<Editable, string>>({} as any)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncingCP, setSyncingCP] = useState(false)

  const fillForm = (profile: any) => setForm(Object.fromEntries(EDITABLE.map(k => [k, profile?.[k] || ''])) as any)

  const syncCodingProfiles = async () => {
    setSyncingCP(true)
    try {
      const res = await api.post('/student/profile/sync-coding-profiles')
      if (res.data?.profiles) {
        setUser((prev: any) => ({
          ...prev,
          codingProfilesData: res.data.profiles,
        }))
        toast.success('Coding profiles refreshed from portals!')
      }
    } catch {
      toast.error('Could not sync coding profiles right now.')
    } finally {
      setSyncingCP(false)
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/auth/me').then(r => r.data).catch(() => null),
      api.get('/student/stats').then(r => r.data).catch(() => null),
    ]).then(([profile, studentStats]) => {
      if (profile) { setUser(profile); fillForm(profile); localStorage.setItem('user', JSON.stringify(profile)) }
      setStats(studentStats)
    }).finally(() => setLoading(false))
  }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string | null> = {}
      EDITABLE.forEach(key => {
        const value = (form[key] || '').trim()
        payload[key] = value || (URL_FIELDS.includes(key) ? null : '')
      })
      if (!payload.name) delete payload.name
      const { data } = await api.patch('/student/profile', payload)
      const merged = { ...user, ...data }
      setUser(merged)
      fillForm(merged)
      localStorage.setItem('user', JSON.stringify(merged))
      setEditing(false)
      toast.success('Profile updated')
      // Auto-refresh coding profiles in background
      if (
        payload.leetcodeUsername || payload.codeforcesUsername ||
        payload.codechefUsername || payload.hackerrankUsername || payload.hackerearthUsername
      ) {
        syncCodingProfiles()
      }
    } catch (error: any) {
      const message = error?.response?.data?.message
      toast.error(Array.isArray(message) ? message.join('. ') : message || 'Your profile could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const checklist: [string, boolean][] = [
    ['Add a short bio', !!user?.bio],
    ['Add your phone number', !!user?.mobileNumber],
    ['Link your GitHub', !!user?.githubUrl],
    ['Link your LinkedIn', !!user?.linkedInUrl],
    ['Upload a profile photo', !!user?.profilePicture],
  ]
  const completion = Math.round((checklist.filter(([, done]) => done).length / checklist.length) * 100)
  const location = [user?.state, user?.country].filter(Boolean).join(', ')

  const field = (key: Editable, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="ui-field">
      <label className="ui-label" htmlFor={`pf-${key}`}>{label}</label>
      <input id={`pf-${key}`} className="ui-input" value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  )

  return (
    <div className="portal-page">
      <StudentReferenceShell active="settings" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <PageHeader eyebrow="Account" title="Profile" description="How you appear to instructors and classmates." />

        {loading ? <Loading label="Loading profile" /> : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
            <div className="grid gap-6 min-w-0">
              {/* Identity */}
              <section className="ui-card overflow-hidden">
                <div className="h-24 bg-[#1f3a5f]" style={{ backgroundImage: 'radial-gradient(circle at 90% 0%, rgba(210,178,124,.25), transparent 50%)', boxShadow: 'inset 0 -3px 0 #9a7a43' }} />
                <div className="px-7 pb-7 -mt-10 flex flex-col sm:flex-row sm:items-end gap-5">
                  <span className="grid place-items-center w-24 h-24 rounded-2xl overflow-hidden bg-[var(--bg-surface)] shadow-md shrink-0" style={{ border: '4px solid var(--bg-surface)' }}>
                    {user?.profilePicture
                      ? <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                      : <span className="grid place-items-center w-full h-full bg-[var(--accent-soft)] text-[var(--accent-text)] font-display text-3xl font-semibold">{initials(user?.name)}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-2xl font-semibold role-text-primary truncate">{user?.name || 'Student'}</h2>
                    <ul className="ui-meta mt-1">
                      {user?.collegeName && <li><Landmark /> {user.collegeName}</li>}
                      {location && <li><MapPin /> {location}</li>}
                      {user?.registrationNumber && <li><GraduationCap /> {user.registrationNumber}</li>}
                    </ul>
                  </div>
                  {!editing && <button className="ui-btn ui-btn-secondary" onClick={() => setEditing(true)}><Pencil aria-hidden="true" /> Edit profile</button>}
                </div>
              </section>

              {editing ? (
                <form onSubmit={save} className="ui-card ui-card-pad grid gap-5">
                  <div className="flex items-center justify-between">
                    <h2 className="ui-section-title">Edit profile</h2>
                    <button type="button" className="ui-icon-btn" aria-label="Cancel editing" onClick={() => { fillForm(user); setEditing(false) }}><X /></button>
                  </div>
                  <div className="ui-form-grid">
                    {field('name', 'Full name', { required: true, maxLength: 100 })}
                    {field('mobileNumber', 'Phone number', { type: 'tel', maxLength: 15 })}
                    {field('state', 'State', { maxLength: 100 })}
                    {field('country', 'Country', { maxLength: 100 })}
                  </div>
                  <div className="ui-field">
                    <label className="ui-label" htmlFor="pf-bio">Bio</label>
                    <textarea id="pf-bio" className="ui-textarea" rows={4} maxLength={1000} placeholder="A sentence or two about your interests and goals" value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })} />
                    <span className="ui-hint">{(form.bio || '').length} / 1000</span>
                  </div>
                  <div className="ui-form-grid">
                    {field('githubUrl', 'GitHub URL', { type: 'url', placeholder: 'https://github.com/username' })}
                    {field('linkedInUrl', 'LinkedIn URL', { type: 'url', placeholder: 'https://linkedin.com/in/username' })}
                    {field('portfolioUrl', 'Portfolio URL', { type: 'url', placeholder: 'https://' })}
                  </div>
                  <div className="pt-3 border-t border-[var(--border)]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-text)] mb-3 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4" /> Competitive Programming Accounts
                    </h3>
                    <div className="ui-form-grid">
                      {field('leetcodeUsername', 'LeetCode Username / URL', { placeholder: 'e.g. nealcodes or https://leetcode.com/u/...' })}
                      {field('codeforcesUsername', 'Codeforces Handle / URL', { placeholder: 'e.g. tourist or https://codeforces.com/profile/...' })}
                      {field('codechefUsername', 'CodeChef Username / URL', { placeholder: 'e.g. genady or https://codechef.com/users/...' })}
                      {field('hackerrankUsername', 'HackerRank Username / URL', { placeholder: 'e.g. hacker_123 or https://hackerrank.com/profile/...' })}
                      {field('hackerearthUsername', 'HackerEarth Username / URL', { placeholder: 'e.g. coder_dev or https://hackerearth.com/@...' })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <button type="button" className="ui-btn ui-btn-secondary" onClick={() => { fillForm(user); setEditing(false) }}>Cancel</button>
                    <button className="ui-btn ui-btn-primary" disabled={saving}>{saving ? <><Loader2 className="animate-spin" aria-hidden="true" /> Saving…</> : <><Save aria-hidden="true" /> Save changes</>}</button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <section className="ui-card ui-card-pad md:col-span-2">
                    <h2 className="ui-section-title" style={{ fontSize: 18 }}>About</h2>
                    <p className={`mt-2 leading-7 ${user?.bio ? 'role-text-secondary' : 'role-text-muted italic'}`}>{user?.bio || 'No bio yet. Add a few words about what you are learning and why.'}</p>
                  </section>
                  <section className="ui-card ui-card-pad">
                    <h2 className="ui-section-title" style={{ fontSize: 18 }}>Contact</h2>
                    <ul className="grid gap-3 mt-4 text-sm" style={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
                      <li className="flex items-center gap-3 role-text-secondary"><Mail className="w-4 h-4 role-text-muted" aria-hidden="true" /> {user?.email || '—'}</li>
                      <li className="flex items-center gap-3 role-text-secondary"><Phone className="w-4 h-4 role-text-muted" aria-hidden="true" /> {user?.mobileNumber || <span className="role-text-muted">Not added</span>}</li>
                      <li className="flex items-center gap-3 role-text-secondary"><CalendarDays className="w-4 h-4 role-text-muted" aria-hidden="true" /> Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'}</li>
                    </ul>
                  </section>
                  <section className="ui-card ui-card-pad">
                    <h2 className="ui-section-title" style={{ fontSize: 18 }}>Links</h2>
                    <div className="grid gap-2 mt-4">
                      {([['githubUrl', 'GitHub', Github], ['linkedInUrl', 'LinkedIn', Linkedin], ['portfolioUrl', 'Portfolio', Globe]] as const).map(([key, label, Icon]) => user?.[key]
                        ? <a key={key} href={user[key]} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-secondary ui-btn-sm justify-start"><Icon aria-hidden="true" /> {label}</a>
                        : <button key={key} onClick={() => setEditing(true)} className="ui-btn ui-btn-ghost ui-btn-sm justify-start"><Icon aria-hidden="true" /> Add {label}</button>)}
                    </div>
                  </section>

                  {/* Competitive Programming Portals Card */}
                  <section className="ui-card ui-card-pad md:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="ui-section-title flex items-center gap-2" style={{ fontSize: 18 }}>
                          <Trophy className="w-5 h-5 text-amber-500" /> Competitive Programming Profiles
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Synced real-time rating and solved problem statistics from competitive programming platforms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={syncCodingProfiles}
                        disabled={syncingCP}
                        className="ui-btn ui-btn-secondary ui-btn-sm flex items-center gap-1.5 self-start sm:self-auto"
                        title="Fetch latest stats from portals"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingCP ? 'animate-spin text-indigo-500' : ''}`} />
                        <span>{syncingCP ? 'Syncing Stats…' : 'Sync Profiles'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {/* LeetCode Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs flex items-center gap-1.5 text-amber-500">
                              <span>🟡</span> LeetCode
                            </span>
                            {user?.codingProfilesData?.leetcode?.ranking && (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                Rank #{user.codingProfilesData.leetcode.ranking.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {user?.leetcodeUsername ? (
                            <div className="space-y-1.5">
                              <div className="text-xl font-bold font-display text-[var(--text-primary)]">
                                {user.codingProfilesData?.leetcode?.totalSolved != null
                                  ? `${user.codingProfilesData.leetcode.totalSolved} Solved`
                                  : `@${user.leetcodeUsername.replace(/.*\/+/g, '')}`}
                              </div>
                              {user?.codingProfilesData?.leetcode?.easySolved != null && (
                                <div className="flex items-center gap-2 text-[11px] font-mono">
                                  <span className="text-emerald-500">E: {user.codingProfilesData.leetcode.easySolved}</span>
                                  <span className="text-amber-500">M: {user.codingProfilesData.leetcode.mediumSolved}</span>
                                  <span className="text-rose-500">H: {user.codingProfilesData.leetcode.hardSolved}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)] italic">No account linked</p>
                          )}
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                          {user?.leetcodeUsername ? (
                            <a
                              href={user.codingProfilesData?.leetcode?.profileUrl || (user.leetcodeUsername.startsWith('http') ? user.leetcodeUsername : `https://leetcode.com/u/${user.leetcodeUsername}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <span>View Profile</span> <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button onClick={() => setEditing(true)} className="text-xs text-[var(--accent-text)] hover:underline">
                              + Link LeetCode
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Codeforces Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs flex items-center gap-1.5 text-blue-500">
                              <span>🔵</span> Codeforces
                            </span>
                            {user?.codingProfilesData?.codeforces?.rank && (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 capitalize">
                                {user.codingProfilesData.codeforces.rank}
                              </span>
                            )}
                          </div>
                          {user?.codeforcesUsername ? (
                            <div className="space-y-1.5">
                              <div className="text-xl font-bold font-display text-[var(--text-primary)]">
                                {user.codingProfilesData?.codeforces?.rating != null
                                  ? `Rating: ${user.codingProfilesData.codeforces.rating}`
                                  : `@${user.codeforcesUsername.replace(/.*\/+/g, '')}`}
                              </div>
                              {user?.codingProfilesData?.codeforces?.maxRating != null && (
                                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                                  Max: {user.codingProfilesData.codeforces.maxRating} ({user.codingProfilesData.codeforces.maxRank})
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)] italic">No account linked</p>
                          )}
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                          {user?.codeforcesUsername ? (
                            <a
                              href={user.codingProfilesData?.codeforces?.profileUrl || (user.codeforcesUsername.startsWith('http') ? user.codeforcesUsername : `https://codeforces.com/profile/${user.codeforcesUsername}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <span>View Profile</span> <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button onClick={() => setEditing(true)} className="text-xs text-[var(--accent-text)] hover:underline">
                              + Link Codeforces
                            </button>
                          )}
                        </div>
                      </div>

                      {/* CodeChef Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                              <span>🟤</span> CodeChef
                            </span>
                            {user?.codingProfilesData?.codechef?.stars && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-700/10 text-amber-700 dark:text-amber-400 border border-amber-700/20">
                                {user.codingProfilesData.codechef.stars}★
                              </span>
                            )}
                          </div>
                          {user?.codechefUsername ? (
                            <div className="space-y-1.5">
                              <div className="text-xl font-bold font-display text-[var(--text-primary)]">
                                {user.codingProfilesData?.codechef?.rating != null
                                  ? `Rating: ${user.codingProfilesData.codechef.rating}`
                                  : `@${user.codechefUsername.replace(/.*\/+/g, '')}`}
                              </div>
                              {user?.codingProfilesData?.codechef?.globalRank != null && (
                                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                                  Global: #{user.codingProfilesData.codechef.globalRank.toLocaleString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)] italic">No account linked</p>
                          )}
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                          {user?.codechefUsername ? (
                            <a
                              href={user.codingProfilesData?.codechef?.profileUrl || (user.codechefUsername.startsWith('http') ? user.codechefUsername : `https://www.codechef.com/users/${user.codechefUsername}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <span>View Profile</span> <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button onClick={() => setEditing(true)} className="text-xs text-[var(--accent-text)] hover:underline">
                              + Link CodeChef
                            </button>
                          )}
                        </div>
                      </div>

                      {/* HackerRank Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <span>🟢</span> HackerRank
                            </span>
                            {user?.codingProfilesData?.hackerrank?.badgeCount != null && (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                {user.codingProfilesData.hackerrank.badgeCount} Badges
                              </span>
                            )}
                          </div>
                          {user?.hackerrankUsername ? (
                            <div className="space-y-1.5">
                              <div className="text-base font-bold font-display text-[var(--text-primary)] truncate">
                                @{user.hackerrankUsername.replace(/.*\/+/g, '')}
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)]">
                                Verified Problem Solver
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)] italic">No account linked</p>
                          )}
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                          {user?.hackerrankUsername ? (
                            <a
                              href={user.codingProfilesData?.hackerrank?.profileUrl || (user.hackerrankUsername.startsWith('http') ? user.hackerrankUsername : `https://www.hackerrank.com/profile/${user.hackerrankUsername}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <span>View Profile</span> <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button onClick={() => setEditing(true)} className="text-xs text-[var(--accent-text)] hover:underline">
                              + Link HackerRank
                            </button>
                          )}
                        </div>
                      </div>

                      {/* HackerEarth Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                              <span>🟣</span> HackerEarth
                            </span>
                          </div>
                          {user?.hackerearthUsername ? (
                            <div className="space-y-1.5">
                              <div className="text-base font-bold font-display text-[var(--text-primary)] truncate">
                                @{user.hackerearthUsername.replace(/.*\/+/g, '')}
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)]">
                                Competitive Programmer
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)] italic">No account linked</p>
                          )}
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                          {user?.hackerearthUsername ? (
                            <a
                              href={user.codingProfilesData?.hackerearth?.profileUrl || (user.hackerearthUsername.startsWith('http') ? user.hackerearthUsername : `https://www.hackerearth.com/@${user.hackerearthUsername}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <span>View Profile</span> <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button onClick={() => setEditing(true)} className="text-xs text-[var(--accent-text)] hover:underline">
                              + Link HackerEarth
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <aside className="grid gap-6">
              <section className="ui-card ui-card-pad">
                <div className="flex items-center justify-between">
                  <h2 className="ui-section-title" style={{ fontSize: 18 }}>Profile strength</h2>
                  <span className="font-display text-2xl font-semibold role-text-primary ui-num">{completion}%</span>
                </div>
                <div className="ui-progress is-gold mt-3"><span style={{ width: `${completion}%` }} /></div>
                <ul className="grid gap-2.5 mt-5 text-sm" style={{ listStyle: 'none', margin: '20px 0 0', padding: 0 }}>
                  {checklist.map(([label, done]) => (
                    <li key={label} className={`flex items-center gap-2.5 ${done ? 'role-text-muted line-through' : 'role-text-secondary'}`}>
                      {done ? <CheckCircle2 className="w-4 h-4 text-[var(--success)]" aria-hidden="true" /> : <Circle className="w-4 h-4 role-text-muted" aria-hidden="true" />} {label}
                    </li>
                  ))}
                </ul>
              </section>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Enrolled" value={stats?.enrolledCourses ?? 0} icon={BookOpen} />
                <Stat label="Lessons done" value={stats?.completedLessons ?? 0} icon={CheckCircle2} tone="success" />
                <Stat label="Hours" value={stats?.totalHours ?? 0} icon={Clock3} />
                <Stat label="Streak" value={stats?.streak ?? 0} icon={Flame} tone="gold" />
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
