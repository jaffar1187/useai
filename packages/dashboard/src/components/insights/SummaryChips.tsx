import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Monitor, Code2, Info } from 'lucide-react';
import type { ComputedStats } from '../../lib/stats';
import { TOOL_COLORS, TOOL_DISPLAY_NAMES } from '../../constants/tools';

interface SummaryChipsProps {
  stats: ComputedStats;
  timeMode?: TimeMode;
}

const LANG_COLORS = [
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#f87171',
  '#fb923c',
];

const OTHER_COLOR = '#64748b';

type TimeMode = 'user' | 'ai';

interface Segment {
  name: string;
  displayName: string;
  seconds: number;
  color: string;
  percentage: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return '<1m';
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function buildSegments(
  data: Record<string, number>,
  colors: readonly string[],
  displayNames?: Record<string, string>,
  colorMap?: Record<string, string>,
): Segment[] {
  let otherSeconds = data['other'] ?? 0;
  const entries = Object.entries(data)
    .filter(([key, s]) => s > 0 && key !== 'other')
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0 && otherSeconds === 0) return [];

  const total = entries.reduce((sum, [, s]) => sum + s, 0) + otherSeconds;
  const MAX_SLICES = 6;

  let visible: [string, number][];

  if (entries.length <= MAX_SLICES) {
    visible = entries;
  } else {
    visible = entries.slice(0, MAX_SLICES);
    otherSeconds += entries.slice(MAX_SLICES).reduce((sum, [, s]) => sum + s, 0);
  }

  // Track which index-based colors have been used so we can skip duplicates
  let fallbackIdx = 0;
  const usedColors = new Set<string>();

  const result: Segment[] = visible.map(([name, seconds]) => {
    let color = colorMap?.[name];
    if (!color || usedColors.has(color)) {
      // Find next unused fallback color
      while (usedColors.has(colors[fallbackIdx % colors.length]!)) {
        fallbackIdx++;
        if (fallbackIdx >= colors.length * 2) break; // safety
      }
      color = colors[fallbackIdx % colors.length]!;
      fallbackIdx++;
    }
    usedColors.add(color);
    return {
      name,
      displayName: displayNames?.[name] ?? name,
      seconds,
      color,
      percentage: (seconds / total) * 100,
    };
  });

  if (otherSeconds > 0) {
    result.push({
      name: 'other',
      displayName: 'other',
      seconds: otherSeconds,
      color: OTHER_COLOR,
      percentage: (otherSeconds / total) * 100,
    });
  }

  return result;
}

function DonutCard({
  title,
  icon,
  segments,
  rawData,
}: {
  title: string;
  icon: React.ReactNode;
  segments: Segment[];
  rawData?: Record<string, number>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 36;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const arcs = segments.map((seg) => {
    const dashLength = (seg.percentage / 100) * circumference;
    const gap = circumference - dashLength;
    const offset = -accumulated + circumference * 0.25;
    accumulated += dashLength;
    return { ...seg, dashLength, gap, offset };
  });

  const hoveredSeg = hovered ? segments.find((s) => s.name === hovered) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-bg-surface-1 border border-border/50 p-4"
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-bg-surface-2">
            {icon}
          </div>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke="var(--color-bg-surface-2, #1e293b)"
              strokeWidth={strokeWidth}
              opacity={0.3}
            />
            {arcs.map((arc, i) => (
              <motion.circle
                key={`${title}-${arc.name}`}
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arc.dashLength} ${arc.gap}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="butt"
                style={{
                  opacity: hovered && hovered !== arc.name ? 0.3 : 1,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={() => setHovered(arc.name)}
                onMouseLeave={() => setHovered(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: hovered && hovered !== arc.name ? 0.3 : 1 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {hoveredSeg ? (
              <>
                <span className="text-sm font-bold text-text-primary leading-none">
                  {hoveredSeg.percentage.toFixed(0)}%
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-text-primary leading-none">
                {segments.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full">
          {rawData && (
            <div className="flex items-center gap-2.5 px-1 -mx-1 mb-1">
              <span className="w-2.5 shrink-0" />
              <span className="flex-1" />
              <div className="relative group cursor-pointer w-12 text-right shrink-0">
                <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider flex items-center gap-0.5 justify-end">Calc <Info className="w-2.5 h-2.5" /></span>
                <div className="absolute right-0 top-4 z-50 w-48 rounded-lg bg-bg-surface-2 border border-border/50 p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                  <p className="text-[11px] text-text-muted leading-relaxed">Overlapping session time is equally divided between categories.</p>
                </div>
              </div>
              <div className="relative group cursor-pointer w-12 text-right shrink-0">
                <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider flex items-center gap-0.5 justify-end">Raw <Info className="w-2.5 h-2.5" /></span>
                <div className="absolute right-0 top-4 z-50 w-48 rounded-lg bg-bg-surface-2 border border-border/50 p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                  <p className="text-[11px] text-text-muted leading-relaxed">Each session's full active time, no division between overlapping sessions.</p>
                </div>
              </div>
              <span className="w-10 shrink-0" />
            </div>
          )}
          <div className="space-y-1.5">
          {segments.map((seg, i) => (
            <motion.div
              key={seg.name}
              className="flex items-center gap-2.5 rounded-md px-1 -mx-1 cursor-pointer transition-colors"
              style={{
                backgroundColor: hovered === seg.name ? 'var(--color-bg-surface-2, rgba(255,255,255,0.05))' : 'transparent',
                opacity: hovered && hovered !== seg.name ? 0.4 : 1,
              }}
              onMouseEnter={() => setHovered(seg.name)}
              onMouseLeave={() => setHovered(null)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: hovered && hovered !== seg.name ? 0.4 : 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-text-secondary font-medium truncate flex-1 min-w-0">
                {seg.displayName}
              </span>
              <span className="text-[10px] text-text-muted font-mono w-12 text-right shrink-0">
                {formatTime(seg.seconds)}
              </span>
              {rawData && (
                <span className="text-[10px] text-text-muted font-mono w-12 text-right shrink-0">
                  {formatTime(rawData[seg.name] ?? 0)}
                </span>
              )}
              <span className="text-[10px] text-text-muted/70 font-mono w-10 text-right shrink-0">
                {seg.percentage.toFixed(0)}%
              </span>
            </motion.div>
          ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SummaryChips({ stats, timeMode = 'user' }: SummaryChipsProps) {
  const clientData = timeMode === 'user' ? stats.byToolClockTime : stats.byAiToolDuration;
  const langData = timeMode === 'user' ? stats.byLanguageClockTime : stats.byLanguageAiTime;
  const clientRaw = timeMode === 'user' ? (stats as any).byToolRawClock : undefined;
  const langRaw = timeMode === 'user' ? (stats as any).byLanguageRawClock : undefined;

  const clientSegments = useMemo(
    () => buildSegments(clientData, LANG_COLORS, TOOL_DISPLAY_NAMES, TOOL_COLORS),
    [clientData],
  );

  const langSegments = useMemo(
    () => buildSegments(langData, LANG_COLORS),
    [langData],
  );

  if (clientSegments.length === 0 && langSegments.length === 0) return null;

  return (
    <>
      {clientSegments.length > 0 && (
        <DonutCard
          title="AI Tools"
          icon={<Monitor className="w-3.5 h-3.5 text-text-muted" />}
          segments={clientSegments}
          rawData={clientRaw}
        />
      )}
      {langSegments.length > 0 && (
        <DonutCard
          title="Languages"
          icon={<Code2 className="w-3.5 h-3.5 text-text-muted" />}
          segments={langSegments}
          rawData={langRaw}
        />
      )}
    </>
  );
}
