import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from "lucide-react";
import { StatusBadge } from "../StatusBadge";
import { TimeScrubber } from "./TimeScrubber";
import {
  SCALE_LABELS,
  ROLLING_SCALES,
  CALENDAR_SCALES,
  CALENDAR_SCRUB_MAP,
  SCRUB_CALENDAR_MAP,
  isCalendarScale,
  getTimeWindow,
  jumpScale,
  shouldSnapToLive,
} from "./types";
import type { TimeScale } from "./types";
import type { SessionSeal, Milestone } from "../../lib/api";

interface TimeTravelPanelProps {
  value: number | null;
  onChange: (time: number | null) => void;
  scale: TimeScale;
  onScaleChange: (scale: TimeScale) => void;
  sessions?: SessionSeal[];
  milestones?: Milestone[];
  showPublic?: boolean;
}

export function TimeTravelPanel({
  value,
  onChange,
  scale,
  onScaleChange,
  sessions,
  showPublic = false,
}: TimeTravelPanelProps) {
  const isLive = value === null;
  const isCalendar = isCalendarScale(scale);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  const effectiveTime = isLive ? now : value;

  // Compute window for scrubber
  const timeWindow = getTimeWindow(scale, effectiveTime);

  // Period label
  const periodLabel = useMemo(() => {
    const { start, end } = timeWindow;
    const fmtTime = (iso: string) =>
      new Date(iso).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    const fmtDateShort = (iso: string) =>
      new Date(iso).toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

    const endMs = new Date(end).getTime();
    const isSameDay =
      new Date(start).toDateString() === new Date(endMs - 1).toDateString();

    if (isLive) {
      if (isSameDay) {
        return `${fmtTime(start)} – Now`;
      }
      return `${fmtDateShort(start)}, ${fmtTime(start)} – Now`;
    }

    if (isSameDay) {
      return `${fmtTime(start)} – ${fmtTime(end)}`;
    }
    return `${fmtDateShort(start)}, ${fmtTime(start)} – ${fmtDateShort(end)}, ${fmtTime(end)}`;
  }, [timeWindow, isLive]);

  // Snap-to-live hysteresis (only for rolling scales)
  const snappedToLiveRef = useRef(false);
  const snapTimeRef = useRef(0);

  const handleScrubberChange = useCallback(
    (newTime: number) => {
      // Calendar → rolling transition: scrubbing on a calendar scale
      // smoothly transitions to its rolling equivalent.
      // But if scrubbing near "now", snap to live instead of transitioning
      // (prevents flicker loop: snap-to-live → useEffect restores calendar → re-transition).
      if (isCalendar) {
        const now = Date.now();
        // Snap to live if scrubbing near or past "now".
        // With value-based drag computation, right-drags always produce past timestamps,
        // so this only triggers for tiny drags (< 2s) or left-drags (into the future).
        if (newTime >= now - 2000) {
          onChange(null);
          return;
        }
        const rollingEquiv = CALENDAR_SCRUB_MAP[scale];
        if (rollingEquiv) {
          onScaleChange(rollingEquiv);
        }
        onChange(newTime);
        return;
      }

      const now = Date.now();

      // Snap to live when scrubbing close to "now" (within 2s).
      // TimeScrubber already clamps rolling values to Date.now(), so newTime ≤ now.
      if (newTime >= now - 2000) {
        snappedToLiveRef.current = true;
        snapTimeRef.current = now;
        onChange(null);
        return;
      }

      if (snappedToLiveRef.current && now - snapTimeRef.current < 300) {
        onChange(null);
        return;
      }

      if (
        snappedToLiveRef.current &&
        newTime >= now - 10000 &&
        newTime <= now + 2000
      ) {
        onChange(null);
        return;
      }

      snappedToLiveRef.current = false;
      onChange(newTime);
    },
    [onChange, onScaleChange, isCalendar, scale],
  );

  const handleJump = (direction: -1 | 1) => {
    const newTime = jumpScale(scale, effectiveTime, direction);
    if (shouldSnapToLive(scale, newTime)) {
      onChange(null);
    } else {
      onChange(newTime);
    }
  };

  // Calendar period label for arrow tooltips
  const getJumpLabel = (direction: -1 | 1): string => {
    if (isCalendar) {
      const prefix = direction === -1 ? "Previous" : "Next";
      if (scale === "day") return `${prefix} Day`;
      if (scale === "week") return `${prefix} Week`;
      return `${prefix} Month`;
    }
    return `${direction === -1 ? "Back" : "Forward"} ${SCALE_LABELS[scale].toLowerCase()}`;
  };

  return (
    <div
      data-testid="time-travel-panel"
      className="flex flex-col bg-bg-surface-1 border border-border/50 rounded-2xl overflow-hidden mb-8 shadow-sm"
    >
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-3 border-b border-border/50 gap-4">
        {/* Left: Time + date display */}
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 h-8">
              <div className="flex items-center gap-2 px-2 -ml-2 py-1">
                <Clock
                  className={`w-5 h-5 ${isLive ? "text-text-muted" : "text-history"}`}
                />
                <span
                  data-testid="time-display"
                  className={`text-xl font-mono font-bold tracking-tight tabular-nums ${isLive ? "text-text-primary" : "text-history"}`}
                >
                  {new Date(effectiveTime).toLocaleTimeString([], {
                    hour12: true,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {isLive ? (
              <StatusBadge
                label="Live"
                color="success"
                dot
                glow
                data-testid="live-badge"
              />
            ) : (
              <>
                <StatusBadge
                  label="History"
                  color="muted"
                  data-testid="history-badge"
                />
                <button
                  data-testid="go-live-button"
                  onClick={() => onChange(null)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-history/10 hover:bg-history text-history hover:text-white rounded-xl transition-all border border-history/20"
                >
                  <RotateCcw className="w-3 h-3 group-hover:-rotate-90 transition-transform duration-500" />
                  Live
                </button>
              </>
            )}
          </div>

          {/* Date + period display */}
          <div className="flex items-center gap-2 text-sm text-text-secondary font-medium px-0.5">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span data-testid="date-display">
              {new Date(effectiveTime).toLocaleDateString([], {
                weekday: "short",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-text-muted">·</span>
            <span
              data-testid="period-label"
              className="text-text-muted text-xs tabular-nums"
            >
              {periodLabel}
            </span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Scale buttons — rolling | calendar */}
          <div className="flex items-end gap-2">
            {/* Rolling group */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted/60">
                Last
              </span>
              <div className="flex items-center bg-bg-surface-2/50 border border-border/50 rounded-xl p-1 shadow-inner">
                {ROLLING_SCALES.map((s) => (
                  <button
                    key={s}
                    data-testid={`scale-${s}`}
                    onClick={() => onScaleChange(s)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                      scale === s
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                    }`}
                    title={SCALE_LABELS[s]}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar group */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted/60">
                Current
              </span>
              <div className="flex items-center bg-bg-surface-2/50 border border-border/50 rounded-xl p-1 shadow-inner">
                {CALENDAR_SCALES.map((s) => {
                  const isActive =
                    scale === s || SCRUB_CALENDAR_MAP[scale] === s;
                  return (
                    <button
                      key={s}
                      data-testid={`scale-${s}`}
                      onClick={() => onScaleChange(s)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                        isActive
                          ? "bg-white/15 text-white shadow-sm"
                          : "text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                      }`}
                      title={SCALE_LABELS[s]}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Nav arrows */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-bg-surface-2/50 border border-border/50 rounded-xl p-1">
              <button
                onClick={() => handleJump(-1)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-surface-2 rounded-lg transition-colors"
                title={getJumpLabel(-1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleJump(1)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-surface-2 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                title={getJumpLabel(1)}
                disabled={isLive || effectiveTime >= Date.now() - 1000}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrubber */}
      <TimeScrubber
        value={effectiveTime}
        onChange={handleScrubberChange}
        scale={scale}
        window={
          isCalendar
            ? {
                start: new Date(timeWindow.start).getTime(),
                end: new Date(timeWindow.end).getTime(),
              }
            : undefined
        }
        sessions={sessions}
        milestones={undefined}
        showPublic={showPublic}
      />
    </div>
  );
}
