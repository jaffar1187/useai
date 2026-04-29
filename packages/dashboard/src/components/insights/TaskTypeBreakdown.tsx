import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListChecks, X, Info } from 'lucide-react';
import type { Milestone, SessionSeal } from '../../lib/api.js';

const TASK_TYPE_COLORS: Record<string, string> = {
  coding: '#b4f82c',
  debugging: '#f87171',
  testing: '#60a5fa',
  planning: '#a78bfa',
  reviewing: '#34d399',
  documenting: '#fbbf24',
  learning: '#f472b6',
  deployment: '#fb923c',
  devops: '#e879f9',
  research: '#22d3ee',
  migration: '#facc15',
  design: '#c084fc',
  data: '#2dd4bf',
  security: '#f43f5e',
  configuration: '#a3e635',
  other: '#94a3b8',
};

type TimeMode = 'user' | 'ai';

function formatTime(seconds: number): string {
  if (seconds < 60) return '<1m';
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatTaskType(s: string): string {
  return s.replace(/_/g, "-");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface TaskTypeBreakdownProps {
  byTaskTypeClockTime: Record<string, number>;
  byTaskTypeAiTime?: Record<string, number>;
  byTaskTypeRawClock?: Record<string, number>;
  sessions?: SessionSeal[];
  milestones?: Milestone[];
  showPublic?: boolean;
  timeMode?: TimeMode;
}

export function TaskTypeBreakdown({ byTaskTypeClockTime, byTaskTypeAiTime, byTaskTypeRawClock, sessions = [], milestones = [], showPublic = false, timeMode = 'user' }: TaskTypeBreakdownProps) {

  const data = timeMode === 'user' || !byTaskTypeAiTime ? byTaskTypeClockTime : byTaskTypeAiTime;

  const entries = Object.entries(data)
    .filter(([, seconds]) => seconds > 0)
    .sort((a, b) => b[1] - a[1]);

  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (entries.length === 0) return null;

  const maxValue = entries[0]![1];

  return (
    <>
      <div className="rounded-xl bg-bg-surface-1 border border-border/50 p-4 mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest">
            Task Types
          </h2>
        </div>

        {timeMode === 'user' && byTaskTypeRawClock && (
          <div className="flex items-center gap-3 mb-1 px-1">
            <span className="w-24 shrink-0" />
            <span className="flex-1" />
            <div className="relative group cursor-pointer w-12 text-right shrink-0">
              <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider flex items-center gap-0.5 justify-end">Calc <Info className="w-2.5 h-2.5" /></span>
              <div className="absolute right-0 top-4 z-50 w-48 rounded-lg bg-bg-surface-2 border border-border/50 p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                <p className="text-[11px] text-text-muted leading-relaxed">Overlapping session time is equally divided between task types.</p>
              </div>
            </div>
            <div className="relative group cursor-pointer w-12 text-right shrink-0">
              <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider flex items-center gap-0.5 justify-end">Raw <Info className="w-2.5 h-2.5" /></span>
              <div className="absolute right-0 top-4 z-50 w-48 rounded-lg bg-bg-surface-2 border border-border/50 p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                <p className="text-[11px] text-text-muted leading-relaxed">Each session's full active time, no division between overlapping sessions.</p>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-2.5">
          {entries.map(([type, seconds], index) => {
            const color = TASK_TYPE_COLORS[type] ?? TASK_TYPE_COLORS['other']!;
            const widthPercent = (seconds / maxValue) * 100;

            return (
              <button
                key={`${timeMode}-${type}`}
                className="flex items-center gap-3 w-full text-left hover:bg-bg-surface-2/30 rounded-lg px-1 -mx-1 py-0.5 transition-colors cursor-pointer"
                onClick={() => setSelectedType(type)}
              >
                <span className="text-xs text-text-secondary font-medium w-24 text-right shrink-0">
                  {formatTaskType(type)}
                </span>

                <div className="flex-1 h-5 rounded bg-bg-surface-2/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>

                <span className="text-xs text-text-muted font-mono w-12 text-right shrink-0">
                  {formatTime(seconds)}
                </span>
                {timeMode === 'user' && byTaskTypeRawClock && (
                  <span className="text-xs text-text-muted font-mono w-12 text-right shrink-0">
                    {formatTime(byTaskTypeRawClock[type] ?? 0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedType && (
          <TaskTypeOverlay
            taskType={selectedType}
            sessions={sessions}
            milestones={milestones}
            showPublic={showPublic}
            onClose={() => setSelectedType(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function TaskTypeOverlay({
  taskType,
  sessions,
  milestones,
  showPublic,
  onClose,
}: {
  taskType: string;
  sessions: SessionSeal[];
  milestones: Milestone[];
  showPublic: boolean;
  onClose: () => void;
}) {
  const color = TASK_TYPE_COLORS[taskType] ?? TASK_TYPE_COLORS['other']!;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const promptIdSet = useMemo(
    () => new Set(sessions.filter(s => s.taskType === taskType).map(s => s.promptId)),
    [sessions, taskType],
  );

  const filtered = useMemo(
    () => milestones
      .filter((m) => promptIdSet.has(m.promptId))
      .sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1)),
    [milestones, promptIdSet],
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-0 bottom-0 top-[53px] bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-[53px] right-0 h-[calc(100%-53px)] w-full max-w-md bg-bg-base border-l border-border/50 z-40 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <ListChecks className="w-4 h-4" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-text-primary">{formatTaskType(taskType)}</h2>
            <span className="text-[10px] font-mono text-text-muted">
              {filtered.length} milestone{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Milestone list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {filtered.map((m, i) => {
            const title = showPublic ? m.title : (m.privateTitle ?? m.title);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.6) }}
                className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-bg-surface-1 transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-secondary leading-snug">{title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-text-muted">
                      {formatDate(m.createdAt)}
                    </span>
                    <span className="text-[10px] text-text-muted capitalize">{m.category}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-text-muted text-xs py-8 px-4 space-y-1">
              <p>No milestones logged</p>
              <p className="text-text-muted/60">Sessions focused on exploration or review may not produce milestones.</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
