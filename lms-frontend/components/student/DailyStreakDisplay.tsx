'use client'
import { useEffect, useState } from 'react'

export default function DailyStreakDisplay() {
    const [streak, setStreak] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10)
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/daily-streak/today?date=${today}`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data && !data.message) setStreak(data)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="h-32 bg-[var(--bg-raised)] animate-pulse rounded-2xl" />
    if (!streak) return (
        <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20">
            <p className="text-amber-500 text-sm font-medium italic">No coding streak question set for today. Check back later!</p>
        </div>
    )

    return (
        <div className="glass-card p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-bold rounded uppercase tracking-wider">Daily Challenge</span>
                <span className="text-gray-500 text-xs font-mono">Q#{streak.question?.questionNumber}</span>
            </div>
            <h4 className="text-white font-bold text-lg mb-3 line-clamp-2 leading-snug">{streak.question?.questionText}</h4>
            <button
                className="w-full mt-2 py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
                onClick={() => window.location.href = '/dashboard/student/streak'}
            >
                Solve Coding Challenge
            </button>
        </div>
    )
}
