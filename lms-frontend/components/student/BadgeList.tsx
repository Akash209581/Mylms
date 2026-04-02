'use client';

interface Badge {
  id: number;
  name: string;
  icon: string;
  description: string;
}

export default function BadgeList({ badges }: { badges: Badge[] }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-raised)]/30 rounded-2xl border border-dashed border-[var(--border)]">
        <span className="text-4xl mb-4 opacity-20">🛡️</span>
        <p className="text-[var(--text-muted)] text-sm italic text-center">
          No badges earned yet. Keep learning to unlock achievements!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="group relative flex flex-col items-center p-4 bg-[var(--bg-raised)] rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all hover:scale-105 shadow-sm"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center text-3xl mb-3 shadow-inner group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-all">
            {badge.icon || '🏅'}
          </div>
          <p className="text-xs font-bold text-[var(--text-primary)] text-center line-clamp-1">{badge.name}</p>

          {/* Tooltip */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 p-2 bg-[var(--bg-surface)] text-[10px] text-[var(--text-secondary)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-[var(--border)]">
            {badge.description}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--bg-surface)] rotate-45 border-r border-b border-[var(--border)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
