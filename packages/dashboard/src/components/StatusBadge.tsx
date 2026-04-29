import type { ReactNode, CSSProperties as _CSS } from 'react';
import React from 'react';

const COLOR_STYLES = {
  accent: {
    border: 'border-accent/20',
    bg: 'bg-[var(--accent-alpha)]',
    dot: 'bg-accent',
  },
  success: {
    border: 'border-success/30',
    bg: 'bg-success/15',
    dot: 'bg-success',
  },
  muted: {
    border: 'border-border',
    bg: 'bg-bg-surface-2/50',
    dot: 'bg-text-muted',
  },
} as const;

interface StatusBadgeProps {
  label: string;
  color?: 'accent' | 'success' | 'muted';
  dot?: boolean;
  icon?: ReactNode;
  glow?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function StatusBadge({
  label,
  color = 'accent',
  dot = false,
  icon,
  glow = false,
  className = '',
  'data-testid': dataTestId,
}: StatusBadgeProps) {
  const styles = COLOR_STYLES[color];

  const inlineStyle: React.CSSProperties = color === 'success'
    ? { backgroundColor: 'rgba(var(--accent-rgb), 0.15)', borderColor: 'rgba(var(--accent-rgb), 0.3)', ...(glow ? { boxShadow: '0 0 10px rgba(var(--accent-rgb), 0.15)' } : {}) }
    : glow ? { boxShadow: '0 0 10px rgba(var(--accent-rgb), 0.1)' } : {};

  return (
    <div
      data-testid={dataTestId}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${styles.border} ${styles.bg} ${className}`}
      style={inlineStyle}
    >
      {dot && (
        <span className="relative flex w-1.5 h-1.5 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: color === 'success' ? 'var(--success)' : color === 'accent' ? 'var(--accent)' : 'var(--text-muted)' }}
          />
          <span
            className="relative inline-flex rounded-full w-1.5 h-1.5"
            style={{ backgroundColor: color === 'success' ? 'var(--success)' : color === 'accent' ? 'var(--accent)' : 'var(--text-muted)' }}
          />
        </span>
      )}
      {icon}
      <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: color === 'success' ? 'var(--success)' : 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}
