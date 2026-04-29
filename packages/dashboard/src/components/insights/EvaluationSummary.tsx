import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { motion } from 'motion/react';
import type { SessionSeal } from '../../lib/api';

interface EvaluationSummaryProps {
  sessions: SessionSeal[];
}

interface ScoreRow {
  label: string;
  value: number;
  max: number;
}

function getBarColor(score: number): string {
  if (score >= 5) return 'var(--color-text-muted)';
  if (score >= 4) return '#f59e0b';
  if (score >= 3) return '#f97316';
  return 'var(--color-error)';
}

export function EvaluationSummary({ sessions }: EvaluationSummaryProps) {
  const { scores, promptsLine, iterationsLine } = useMemo(() => {
    const evaluated = sessions.filter((s) => s.evaluation != null);

    if (evaluated.length === 0) {
      return { scores: null, promptsLine: null, iterationsLine: null };
    }

    let promptQualitySum = 0;
    let contextSum = 0;
    let independenceSum = 0;
    let scopeSum = 0;
    let iterationSum = 0;

    for (const s of evaluated) {
      const ev = s.evaluation!;
      promptQualitySum += ev.promptQuality;
      contextSum += ev.contextProvided;
      independenceSum += ev.independenceLevel;
      scopeSum += ev.scopeQuality;
      iterationSum += ev.iterationCount;
    }

    const n = evaluated.length;
    const avgIterations = iterationSum / n;

    const rows: ScoreRow[] = [
      { label: 'Prompt Quality', value: promptQualitySum / n, max: 5 },
      { label: 'Context', value: contextSum / n, max: 5 },
      { label: 'Independence', value: independenceSum / n, max: 5 },
      { label: 'Scope', value: scopeSum / n, max: 5 },
    ];

    return {
      scores: rows,
      promptsLine: `${sessions.length} prompts`,
      iterationsLine: `avg ${avgIterations.toFixed(1)} iterations`,
    };
  }, [sessions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-bg-surface-1 border border-border/50 p-4 self-start"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-bg-surface-2">
          <Target className="w-3.5 h-3.5 text-text-muted" />
        </div>
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest">
          AI Proficiency
        </h2>
      </div>

      {scores === null ? (
        <p className="text-xs text-text-muted py-2">No evaluation data yet</p>
      ) : (
        <>
          <div className="space-y-3">
            {scores.map((row, index) => {
              const pct = (row.value / row.max) * 100;
              const isCompletion = row.label === 'Completion';
              const displayValue = isCompletion
                  ? `${Math.round(pct)}%`
                  : row.value >= 5 ? '5/5' : `${row.value.toFixed(1)}/5`;
              const isPerfect = row.value >= row.max;

              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary font-medium w-28 text-right shrink-0">
                    {row.label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-bg-surface-2/50 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: getBarColor(row.value) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.6,
                        delay: index * 0.05,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs font-mono w-10 text-right shrink-0 ${isPerfect ? 'text-text-muted' : 'font-bold'}`}
                    style={isPerfect ? undefined : { color: getBarColor(row.value) }}
                  >
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 px-1 space-y-0.5">
            <p className="text-[10px] text-text-muted font-mono">{promptsLine}</p>
            <p
              className="text-[10px] text-text-muted font-mono cursor-help"
              title="Average number of back-and-forth rounds needed per task. Lower = AI understood the request first time. Self-reported by the AI in each session."
            >
              {iterationsLine}
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
