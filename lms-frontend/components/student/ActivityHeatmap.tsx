'use client';
import React, { useMemo } from 'react';

interface Activity {
  date: string;
  count: number;
}

const ActivityHeatmap = React.memo(function ActivityHeatmap({ data }: { data: Activity[] }) {
  const cells = useMemo(() => {
    const days = 365;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    const activityMap = new Map((Array.isArray(data) ? data : []).map((d) => [d.date, Number(d.count)]));

    const result = [];
    for (let i = 0; i <= days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = activityMap.get(dateStr) || 0;
      result.push({ date: dateStr, count });
    }
    return result;
  }, [data]);

  const getDayColor = (count: number) => {
    if (count === 0) return 'bg-[var(--bg-raised)]';
    if (count < 3) return 'bg-indigo-500/20';
    if (count < 6) return 'bg-indigo-500/40';
    if (count < 10) return 'bg-indigo-500/70';
    return 'bg-indigo-500';
  };

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex flex-wrap gap-1 min-w-[700px]">
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className={`w-3 h-3 rounded-sm ${getDayColor(cell.count)} transition-all hover:scale-125 cursor-help border border-white/5`}
            title={`${cell.date}: ${cell.count} lessons completed`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[10px] text-[var(--text-muted)] font-bold">
        <span>Less</span>
        <div className="w-2 h-2 rounded-sm bg-[var(--bg-raised)]" />
        <div className="w-2 h-2 rounded-sm bg-indigo-500/20" />
        <div className="w-2 h-2 rounded-sm bg-indigo-500/40" />
        <div className="w-2 h-2 rounded-sm bg-indigo-500/70" />
        <div className="w-2 h-2 rounded-sm bg-indigo-500" />
        <span>More</span>
      </div>
    </div>
  );
});

export default ActivityHeatmap;