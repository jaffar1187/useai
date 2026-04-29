import pc from "picocolors";

export const success = (msg: string) => console.log(pc.green(`  ✓ ${msg}`));
export const warn    = (msg: string) => console.log(pc.yellow(`  ⚠ ${msg}`));
export const fail    = (msg: string) => console.log(pc.red(`  ✗ ${msg}`));
export const info    = (msg: string) => console.log(pc.cyan(`  → ${msg}`));
export const dim     = (msg: string) => console.log(pc.dim(`  ${msg}`));
export const bold    = (msg: string) => console.log(pc.bold(`  ${msg}`));

export function header(title: string): void {
  console.log();
  console.log(pc.bold(`  ${title}`));
  console.log();
}

export function label(key: string, value: string, width = 20): void {
  console.log(`  ${pc.dim(key.padEnd(width))} ${value}`);
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatScore(score: number | undefined): string {
  if (score === undefined) return pc.dim("—");
  const pct = Math.round(score * 100);
  if (pct >= 80) return pc.green(`${pct}%`);
  if (pct >= 60) return pc.yellow(`${pct}%`);
  return pc.red(`${pct}%`);
}

export function table(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );

  const line = headers.map((h, i) => pc.bold(h.padEnd(widths[i] ?? 0))).join("  ");
  const sep  = widths.map((w) => "─".repeat(w)).join("  ");

  console.log(`  ${line}`);
  console.log(`  ${pc.dim(sep)}`);
  for (const row of rows) {
    console.log(`  ${row.map((c, i) => (c ?? "").padEnd(widths[i] ?? 0)).join("  ")}`);
  }
}

export function spinner(msg: string): () => void {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${pc.cyan(frames[i++ % frames.length] ?? "⠋")} ${msg}`);
  }, 80);
  return () => {
    clearInterval(interval);
    process.stdout.write("\r\x1b[K");
  };
}
