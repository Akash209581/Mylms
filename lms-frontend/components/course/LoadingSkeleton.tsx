'use client'

export default function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 my-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="rounded-[20px] bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden p-5 space-y-4 animate-pulse">
                    <div className="h-40 bg-[var(--bg-raised)] rounded-2xl w-full" />
                    <div className="space-y-2">
                        <div className="h-4 bg-[var(--bg-raised)] rounded-lg w-3/4" />
                        <div className="h-3 bg-[var(--bg-raised)] rounded-lg w-1/2" />
                    </div>
                    <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
                        <div className="h-4 bg-[var(--bg-raised)] rounded-lg w-12" />
                        <div className="h-8 bg-[var(--bg-raised)] rounded-xl w-24" />
                    </div>
                </div>
            ))}
        </div>
    )
}
