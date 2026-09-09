'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return <label className="relative grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] focus-within:ring-2 focus-within:ring-[var(--focus-ring)]" title="Choose color theme">
    <Palette size={19} aria-hidden="true" />
    <select aria-label="Choose color theme" value={mounted ? theme || 'light' : 'light'} onChange={event => setTheme(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
      {['light', 'dark', 'ocean', 'forest', 'rose', 'lavender'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
    </select>
  </label>
}
