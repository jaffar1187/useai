/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'bg-base': 'rgba(var(--bg-base-rgb), <alpha-value>)',
        'bg-surface-1': 'rgba(var(--bg-surface-1-rgb), <alpha-value>)',
        'bg-surface-2': 'rgba(var(--bg-surface-2-rgb), <alpha-value>)',
        'bg-surface-3': 'rgba(var(--bg-surface-3-rgb), <alpha-value>)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'rgba(var(--text-secondary-rgb), <alpha-value>)',
        'text-muted': 'rgba(var(--text-muted-rgb), <alpha-value>)',
        accent: 'rgba(var(--accent-rgb), <alpha-value>)',
        'accent-bright': 'var(--accent-bright)',
        'accent-dim': 'var(--accent-dim)',
        success: 'rgba(var(--accent-rgb), <alpha-value>)',
        error: 'rgba(var(--error-rgb), <alpha-value>)',
        warning: 'rgba(var(--streak-rgb), <alpha-value>)',
        streak: 'rgba(var(--streak-rgb), <alpha-value>)',
        history: 'rgba(var(--history-rgb), <alpha-value>)',
        border: 'rgba(var(--border-rgb), <alpha-value>)',
        purple: 'rgba(139, 92, 246, <alpha-value>)',
        blue: 'rgba(59, 130, 246, <alpha-value>)',
        emerald: 'rgba(52, 211, 153, <alpha-value>)',
        amber: 'rgba(251, 191, 36, <alpha-value>)',
      },
    },
  },
  plugins: [],
};
