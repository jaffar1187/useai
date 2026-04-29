import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import type { SessionSeal } from '../../lib/api';
import type { Milestone } from '../../lib/api';

interface SkillRadarProps {
  sessions: SessionSeal[];
  milestones: Milestone[];
  streak: number;
}

interface Axis {
  label: string;
  value: number;
  display: string;
  tooltip: string;
}

/** Compute a point on the pentagon at a given axis index and radius (0-1). */
function pentagonPoint(
  axisIndex: number,
  radius: number,
  cx: number,
  cy: number,
  r: number,
): [number, number] {
  const angle = (Math.PI * 2 * axisIndex) / 5 - Math.PI / 2;
  return [cx + r * radius * Math.cos(angle), cy + r * radius * Math.sin(angle)];
}

function pentagonPath(scale: number, cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const [x, y] = pentagonPoint(i, scale, cx, cy, r);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

function labelPosition(
  axisIndex: number,
  cx: number,
  cy: number,
  r: number,
): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const [x, y] = pentagonPoint(axisIndex, 1.32, cx, cy, r);
  let anchor: 'start' | 'middle' | 'end' = 'middle';
  if (axisIndex === 1 || axisIndex === 2) anchor = 'start';
  if (axisIndex === 3 || axisIndex === 4) anchor = 'end';
  return { x, y, anchor };
}

export function SkillRadar({ sessions, milestones }: SkillRadarProps) {
  const axes = useMemo((): Axis[] => {
    const evaluated = sessions.filter((s) => s.evaluation != null);

    // 1. Completion Rate — % completed
    const completed = evaluated.filter((s) => s.evaluation!.taskOutcome === 'completed').length;
    const completionPct = evaluated.length > 0 ? completed / evaluated.length : 0;

    // 2. First-Try Rate — % done in 1 iteration
    const firstTry = evaluated.filter((s) => s.evaluation!.iterationCount === 1).length;
    const firstTryPct = evaluated.length > 0 ? firstTry / evaluated.length : 0;

    // 3. Efficiency — inverted avg iterations (1 iter = 100%, 5+ iter = 0%)
    const avgIter = evaluated.length > 0
      ? evaluated.reduce((sum, s) => sum + s.evaluation!.iterationCount, 0) / evaluated.length
      : 1;
    const efficiency = Math.max(0, Math.min(1, (5 - avgIter) / 4));

    // 4. Complexity — weighted score: simple=1, medium=2, complex=4, normalized to max of 4
    const complexCount = milestones.filter((m) => m.complexity === 'complex').length;
    const mediumCount = milestones.filter((m) => m.complexity === 'medium').length;
    const simpleCount = milestones.filter((m) => m.complexity === 'simple').length;
    const weightedComplexity = milestones.length > 0
      ? (simpleCount * 1 + mediumCount * 2 + complexCount * 4) / (milestones.length * 4)
      : 0;

    // 5. Breadth — unique languages / 8
    const uniqueLangs = new Set<string>();
    for (const s of sessions) {
      for (const lang of s.languages) uniqueLangs.add(lang);
    }
    const breadth = Math.min(1, uniqueLangs.size / 8);

    return [
      {
        label: 'Completion',
        value: completionPct,
        display: `${Math.round(completionPct * 100)}%`,
        tooltip: `${completed}/${evaluated.length} tasks completed`,
      },
      {
        label: 'First-Try',
        value: firstTryPct,
        display: `${Math.round(firstTryPct * 100)}%`,
        tooltip: `${firstTry}/${evaluated.length} done in 1 iteration`,
      },
      {
        label: 'Efficiency',
        value: efficiency,
        display: `${avgIter.toFixed(1)} avg`,
        tooltip: `Average ${avgIter.toFixed(1)} iterations per task (lower is better)`,
      },
      {
        label: 'Complexity',
        value: weightedComplexity,
        display: `${complexCount}/${milestones.length}`,
        tooltip: `${complexCount} complex, ${mediumCount} medium, ${simpleCount} simple`,
      },
      {
        label: 'Breadth',
        value: breadth,
        display: `${uniqueLangs.size} langs`,
        tooltip: `${[...uniqueLangs].slice(0, 5).join(', ')}${uniqueLangs.size > 5 ? ` +${uniqueLangs.size - 5} more` : ''}`,
      },
    ];
  }, [sessions, milestones]);

  const cx = 100;
  const cy = 100;
  const r = 70;

  const dataPoints: string[] = [];
  for (let i = 0; i < 5; i++) {
    const val = Math.max(axes[i]!.value, 0.04);
    const [x, y] = pentagonPoint(i, val, cx, cy, r);
    dataPoints.push(`${x},${y}`);
  }
  const dataPath = dataPoints.join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl bg-bg-surface-1 border border-border/50 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-bg-surface-2">
          <BarChart3 className="w-3.5 h-3.5 text-text-muted" />
        </div>
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest">
          Overall Insights
        </h2>
      </div>

      <div className="flex justify-center">
        <svg viewBox="0 0 200 200" width={200} height={200} className="overflow-visible">
          {/* Grid rings */}
          {[0.33, 0.66, 1.0].map((scale) => (
            <polygon
              key={scale}
              points={pentagonPath(scale, cx, cy, r)}
              fill="none"
              stroke="var(--color-bg-surface-3)"
              strokeWidth={0.5}
              opacity={0.6}
            />
          ))}

          {/* Axis lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const [x, y] = pentagonPoint(i, 1, cx, cy, r);
            return (
              <line
                key={`axis-${i}`}
                x1={cx} y1={cy} x2={x} y2={y}
                stroke="var(--color-bg-surface-3)"
                strokeWidth={0.5}
                opacity={0.4}
              />
            );
          })}

          {/* Data shape */}
          <motion.polygon
            points={dataPath}
            fill="var(--color-accent)"
            fillOpacity={0.2}
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />

          {/* Data points */}
          {axes.map((axis, i) => {
            const v = Math.max(axis.value, 0.04);
            const [x, y] = pentagonPoint(i, v, cx, cy, r);
            return (
              <circle
                key={`point-${i}`}
                cx={x} cy={y} r={2.5}
                fill="var(--color-accent-bright)"
              >
                <title>{axis.tooltip}</title>
              </circle>
            );
          })}

          {/* Labels */}
          {axes.map((axis, i) => {
            const pos = labelPosition(i, cx, cy, r);
            return (
              <text
                key={axis.label}
                x={pos.x}
                y={pos.y}
                textAnchor={pos.anchor}
                dominantBaseline="central"
                className="text-[9px] font-medium"
                fill="var(--color-text-secondary)"
              >
                <title>{axis.tooltip}</title>
                {axis.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Values below the chart */}
      <div className="flex justify-center gap-4 mt-2 flex-wrap">
        {axes.map((axis) => (
          <span
            key={axis.label}
            className="text-[10px] font-mono text-text-muted cursor-help"
            title={axis.tooltip}
          >
            {axis.display}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
