import type { DashboardResponse } from '../../lib/api';
import type { TimeScale } from '../time-travel/types';
import { motion } from 'motion/react';

type TimeMode = 'user' | 'ai';

function formatTime(hours: number): string {
  const totalMins = Math.round(hours * 60);
  if (totalMins < 1) return '<1m';
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

interface ActivityStripProps {
  activity: DashboardResponse["activity"];
  timeScale: TimeScale;
  effectiveTime: number;
  timeMode?: TimeMode;
}

export function ActivityStrip({
  activity,
  timeScale,
  effectiveTime,
  timeMode = 'user',
}: ActivityStripProps) {

  const useHourly = timeScale === 'day' || timeScale === '24h' || timeScale === '12h' || timeScale === '6h';
  const useMonthly = timeScale === 'year';
  const useWeekly = timeScale === 'month';

  const hourlyData = useHourly
    ? (timeMode === 'user' ? activity.hourlyClockTime : activity.hourlyAiTime)
    : [];

  // Pick the right granularity for non-hourly views
  const barData: { label: string; hours: number }[] = useHourly ? [] :
    useMonthly ? (timeMode === 'user' ? activity.monthlyClockTime : activity.monthlyAiTime) :
    useWeekly ? (timeMode === 'user' ? activity.weeklyClockTime : activity.weeklyAiTime) :
    (timeMode === 'user' ? activity.dailyClockTime : activity.dailyAiTime).map(d => ({
      label: new Date(d.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short' }),
      hours: d.hours,
    }));

  const title = useHourly
    ? `Hourly — ${new Date(effectiveTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
    : useMonthly ? 'This Year' : useWeekly ? 'This Month' : 'This Week';


  if (useHourly) {
    const maxMinutes = Math.max(...hourlyData.map((d) => d.minutes), 1);

    return (
      <div className="mb-8 p-5 rounded-2xl bg-bg-surface-1/50 border border-border/50">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="text-xs text-text-muted uppercase tracking-widest font-bold">
            {title}
          </div>
        </div>
        <div className="flex items-end gap-[3px] h-16">
          {hourlyData.map((entry, idx) => {
            const heightPct = maxMinutes > 0 ? (entry.minutes / maxMinutes) * 100 : 0;
            return (
              <div
                key={entry.hour}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                  <div className="bg-bg-surface-3 text-text-primary text-[10px] font-mono px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-border flex flex-col items-center">
                    <span className="font-bold">{entry.hour}:00</span>
                    <span className="text-accent">{entry.minutes.toFixed(0)}m active</span>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-bg-surface-3 border-r border-b border-border rotate-45" />
                  </div>
                </div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPct, entry.minutes > 0 ? 8 : 0)}%` }}
                  transition={{ delay: idx * 0.01, duration: 0.5 }}
                  className="w-full rounded-t-sm transition-all duration-300 group-hover:bg-accent relative overflow-hidden"
                  style={{
                    minHeight: entry.minutes > 0 ? '4px' : '0px',
                    backgroundColor:
                      entry.minutes > 0
                        ? `rgba(var(--accent-rgb), ${0.4 + (entry.minutes / maxMinutes) * 0.6})`
                        : 'var(--color-bg-surface-2)',
                  }}
                >
                  {entry.minutes > (maxMinutes * 0.5) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-[3px] mt-2 border-t border-border/30 pt-2">
          {hourlyData.map((entry) => (
            <div key={entry.hour} className="flex-1 text-center">
              {entry.hour % 6 === 0 && (
                <span className="text-[9px] text-text-muted font-bold font-mono uppercase">
                  {entry.hour === 0 ? '12am' : entry.hour < 12 ? `${entry.hour}am` : entry.hour === 12 ? '12pm' : `${entry.hour - 12}pm`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Bar mode (daily / weekly / monthly)
  const maxHours = Math.max(...barData.map((d) => d.hours), 0.1);

  return (
    <div className="mb-8 p-5 rounded-2xl bg-bg-surface-1/50 border border-border/50">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-xs text-text-muted uppercase tracking-widest font-bold">
          {title}
        </div>
      </div>
      <div className="flex items-end gap-2 h-16">
        {barData.map((bar, idx) => {
          const heightPct = maxHours > 0 ? (bar.hours / maxHours) * 100 : 0;
          return (
            <div
              key={`${bar.label}-${idx}`}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                <div className="bg-bg-surface-3 text-text-primary text-[10px] font-mono px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-border flex flex-col items-center">
                  <span className="font-bold">{bar.label}</span>
                  <span className="text-accent">{formatTime(bar.hours)} active</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-bg-surface-3 border-r border-b border-border rotate-45" />
                </div>
              </div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(heightPct, bar.hours > 0 ? 8 : 0)}%` }}
                transition={{ delay: idx * 0.05, duration: 0.5 }}
                className="w-full rounded-t-md cursor-pointer transition-all duration-300 group-hover:scale-x-110 origin-bottom"
                style={{
                  minHeight: bar.hours > 0 ? '4px' : '0px',
                  backgroundColor: bar.hours > 0
                    ? `rgba(var(--accent-rgb), ${0.4 + (bar.hours / maxHours) * 0.6})`
                    : 'var(--color-bg-surface-2)',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2 border-t border-border/30 pt-2">
        {barData.map((bar, idx) => (
          <div key={`label-${bar.label}-${idx}`} className="flex-1 text-center">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-tighter">
              {bar.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
