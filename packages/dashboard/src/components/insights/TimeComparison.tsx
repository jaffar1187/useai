import { motion } from 'motion/react';
import { Clock, Cpu } from 'lucide-react';

interface TimeComparisonProps {
  clockTimeHours: number;
  aiTimeHours: number;
  multiplier: number;
}

function formatTime(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes === 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function TimeComparison({ clockTimeHours, aiTimeHours, multiplier }: TimeComparisonProps) {
  const maxHours = Math.max(clockTimeHours, aiTimeHours, 0.01);
  const clockPct = (clockTimeHours / maxHours) * 100;
  const aiPct = (aiTimeHours / maxHours) * 100;

  const bars = [
    {
      label: 'Clock Time',
      icon: Clock,
      hours: clockTimeHours,
      pct: clockPct,
      color: '#60a5fa',
    },
    {
      label: 'AI Time',
      icon: Cpu,
      hours: aiTimeHours,
      pct: aiPct,
      color: '#a78bfa',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-bg-surface-1 border border-border/50 p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-bg-surface-2">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
        </div>
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest">
          Time Usage
        </h2>
      </div>

      {maxHours < 1 / 60 ? (
        <p className="text-xs text-text-muted py-2">No time data yet</p>
      ) : (
        <>
          <div className="space-y-3">
            {bars.map((bar, index) => {
              const Icon = bar.icon;
              return (
                <div key={bar.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                      <Icon className="w-3 h-3" style={{ color: bar.color }} />
                      {bar.label}
                    </span>
                    <span className="text-xs font-mono text-text-secondary">
                      {formatTime(bar.hours)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-surface-2/50 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: bar.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.pct}%` }}
                      transition={{
                        duration: 0.6,
                        delay: index * 0.1,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 px-1">
            <p className="text-[10px] text-text-muted font-mono">
              {multiplier >= 1.01
                ? `${multiplier.toFixed(2)}x multiplier — parallel sessions stacked ${formatTime(aiTimeHours)} of AI work into ${formatTime(clockTimeHours)}`
                : 'No parallel sessions detected'}
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
