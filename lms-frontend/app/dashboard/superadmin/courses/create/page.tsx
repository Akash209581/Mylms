'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function SuperAdminCreateCoursePage() {
    const router = useRouter()
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: '',
        level: '',
        price: 0,
        objectives: '',
        prerequisites: '',
        published: false
    })
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }
    }, [])

    const handleSubmit = async () => {
        if (!form.title || form.title.length < 5) {
            setError('Title must be at least 5 characters long')
            return
        }
        if (!form.description || form.description.length < 20) {
            setError('Description must be at least 20 characters long')
            return
        }
        
        setSaving(true)
        setError('')
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            })
            
            if (!res.ok) {
                const e = await res.json()
                setError(e.message || 'Error creating course')
                return
            }
            
            const result = await res.json()
            console.log('Course created:', result)
            setSuccess(true)
            setTimeout(() => router.push('/dashboard/superadmin/courses'), 2000)
        } catch (e: any) {
            setError(e.message || 'Network error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Create Course" />
            <main className="page-content">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => router.push('/dashboard/superadmin/courses')}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">← Back</button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Create New Course</h1>
                        <p className="text-gray-400 text-sm">Courses created by SUPER ADMIN are automatically approved</p>
                    </div>
                </div>

                {success ? (
                    <div className="glass-card p-8 text-center">
                        <div className="text-5xl mb-4">✅</div>
                        <h2 className="text-white font-bold text-xl mb-2">Course Created & Approved!</h2>
                        <p className="text-gray-400">Redirecting to courses list...</p>
                    </div>
                ) : (
                    <div className="glass-card p-8 max-w-3xl">
                        {error && (
                            <div className="p-3 rounded-xl mb-5 text-sm text-red-400"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                ❌ {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div>
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <span className="text-xl">📚</span>
                                    Basic Information
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Course Title *</label>
                                        <input
                                            value={form.title}
                                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                            placeholder="e.g. Complete Python Programming Masterclass"
                                            className="input-field text-lg"
                                            maxLength={200}
                                        />
                                        <p className="text-gray-500 text-xs mt-1">{form.title.length}/200 characters (min 5)</p>
                                    </div>

                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Description *</label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                            rows={4}
                                            placeholder="Provide a detailed description of what students will learn..."
                                            className="input-field resize-none"
                                        />
                                        <p className="text-gray-500 text-xs mt-1">{form.description.length} characters (min 20)</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-gray-400 text-sm mb-2 block">Category</label>
                                            <select
                                                value={form.category}
                                                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="">Select category</option>
                                                <option value="Programming">Programming</option>
                                                <option value="Web Development">Web Development</option>
                                                <option value="Data Science">Data Science</option>
                                                <option value="Machine Learning">Machine Learning</option>
                                                <option value="DevOps">DevOps</option>
                                                <option value="Mobile Development">Mobile Development</option>
                                                <option value="Database">Database</option>
                                                <option value="Cloud Computing">Cloud Computing</option>
                                                <option value="Cybersecurity">Cybersecurity</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-gray-400 text-sm mb-2 block">Level</label>
                                            <select
                                                value={form.level}
                                                onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="">Select level</option>
                                                <option value="Beginner">Beginner</option>
                                                <option value="Intermediate">Intermediate</option>
                                                <option value="Advanced">Advanced</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Price ($)</label>
                                        <input
                                            type="number"
                                            value={form.price}
                                            onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            className="input-field"
                                        />
                                        <p className="text-gray-500 text-xs mt-1">Set to 0 for free courses</p>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Details */}
                            <div>
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <span className="text-xl">🎯</span>
                                    Additional Details
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Learning Objectives</label>
                                        <textarea
                                            value={form.objectives}
                                            onChange={e => setForm(p => ({ ...p, objectives: e.target.value }))}
                                            rows={3}
                                            placeholder="What will students be able to do after completing this course?"
                                            className="input-field resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Prerequisites</label>
                                        <textarea
                                            value={form.prerequisites}
                                            onChange={e => setForm(p => ({ ...p, prerequisites: e.target.value }))}
                                            rows={3}
                                            placeholder="What knowledge or skills should students have before taking this course?"
                                            className="input-field resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Publishing Options */}
                            <div>
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <span className="text-xl">🚀</span>
                                    Publishing Options
                                </h3>
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                                    <button
                                        onClick={() => setForm(p => ({ ...p, published: !p.published }))}
                                        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${form.published ? 'bg-green-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${form.published ? 'left-8' : 'left-1'}`} />
                                    </button>
                                    <div>
                                        <p className="text-white text-sm font-medium">
                                            {form.published ? '🌐 Publish Immediately' : '📝 Save as Draft'}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            {form.published 
                                                ? 'Course will be visible to all users immediately' 
                                                : 'Course will be approved but not visible to students yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="btn-primary w-full py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? '⏳ Creating Course...' : '✅ Create & Approve Course'}
                            </button>

                            <p className="text-center text-gray-500 text-xs">
                                💡 As a SUPER ADMIN, your course will be automatically approved and ready to build content
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
