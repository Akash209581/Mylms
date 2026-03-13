'use client'

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Waves, TreePine, Flower2, Sparkles } from "lucide-react"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="w-10 h-10"></div>
    }

    const themes = [
        { name: 'light', icon: Sun, label: 'Light' },
        { name: 'dark', icon: Moon, label: 'Dark' },
        { name: 'ocean', icon: Waves, label: 'Ocean' },
        { name: 'forest', icon: TreePine, label: 'Forest' },
        { name: 'rose', icon: Flower2, label: 'Rose' },
        { name: 'lavender', icon: Sparkles, label: 'Lavender' }
    ]

    const currentThemeObj = themes.find(t => t.name === theme) || themes[0]
    const Icon = currentThemeObj?.icon || Sun

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-raised)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                aria-label="Toggle theme"
            >
                <Icon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-40 rounded-xl shadow-lg z-50 py-1 overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        {themes.map((t) => {
                            const TIcon = t.icon
                            const isActive = theme === t.name
                            return (
                                <button
                                    key={t.name}
                                    onClick={() => {
                                        setTheme(t.name)
                                        setIsOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left`}
                                    style={{
                                        color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                                        backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
                                        fontWeight: isActive ? 600 : 500
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                                    }}
                                >
                                    <TIcon className="w-4 h-4" />
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
