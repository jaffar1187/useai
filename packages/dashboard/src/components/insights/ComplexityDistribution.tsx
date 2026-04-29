import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, X } from 'lucide-react';
import type { Milestone } from '../../lib/api';

interface ComplexityDistributionProps {
  data: {
    simple: number;
    medium: number;
    complex: number;
  };
  milestones?: Milestone[];
  showPublic?: boolean;
}

const BARS: { key: keyof ComplexityDistributionProps['data']; label: string; color: string }[] = [
  { key: 'simple', label: 'simple', color: '#34d399' },
  { key: 'medium', label: 'medium', color: '#fbbf24' },
  { key: 'complex', label: 'complex', color: '#f87171' },
];

export function ComplexityDistribution({ data, milestones = [], showPublic = false }: ComplexityDistributionProps) {
  const total = data.simple + data.medium + data.complex;
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  if (total === 0) return null;

  const maxCount = Math.max(data.simple, data.medium, data.complex);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl bg-bg-surface-1 border border-border/50 p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-bg-surface-2">
            <Layers className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest">
            Milestone Complexity
          </h2>
        </div>

        <div className="space-y-3">
          {BARS.map((bar, index) => {
            const count = data[bar.key];
            const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : '0';

            return (
              <button
                key={bar.key}
                className="flex items-center gap-3 w-full text-left hover:bg-bg-surface-2/30 rounded-lg px-1 -mx-1 py-0.5 transition-colors cursor-pointer"
                onClick={() => count > 0 && setSelectedLevel(bar.key)}
                disabled={count === 0}
              >
                <span className="text-xs text-text-secondary font-medium w-16 text-right shrink-0">
                  {bar.label}
                </span>

                <div className="flex-1 h-5 rounded bg-bg-surface-2/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded"
                    style={{ backgroundColor: bar.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-primary font-mono font-bold w-6 text-right">
                    {count}
                  </span>
                  <span className="text-[10px] text-text-muted/70 font-mono w-8 text-right">
                    {percentage}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stacked summary bar */}
        <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-bg-surface-2/30">
          {BARS.map((bar) => {
            const count = data[bar.key];
            const pct = total > 0 ? (count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <motion.div
                key={bar.key}
                className="h-full"
                style={{ backgroundColor: bar.color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedLevel && (
          <ComplexityOverlay
            level={selectedLevel}
            milestones={milestones}
            showPublic={showPublic}
            onClose={() => setSelectedLevel(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ComplexityOverlay({
  level,
  milestones,
  showPublic,
  onClose,
}: {
  level: string;
  milestones: Milestone[];
  showPublic: boolean;
  onClose: () => void;
}) {
  const bar = BARS.find((b) => b.key === level)!;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = milestones
    .filter((m) => m.complexity === level)
    .sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1));

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
            style={{ backgroundColor: `${bar.color}15` }}
          >
            <Layers className="w-4 h-4" style={{ color: bar.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-text-primary">{bar.label} Milestones</h2>
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
                  style={{ backgroundColor: bar.color }}
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
            <div className="text-center text-text-muted text-xs py-8">
              No {bar.label.toLowerCase()} complexity milestones
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
