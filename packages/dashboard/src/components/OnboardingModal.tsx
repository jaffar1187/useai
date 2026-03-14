import { useState, useCallback, useRef, useEffect } from 'react';
import { Cloud, Globe, Lock, Loader2, Check, X, ChevronRight, Sparkles } from 'lucide-react';
import type { LocalConfig } from '../lib/api';
import { checkUsername, updateUsername, patchConfig } from '../lib/api';

/* ── Username validation ─────────────────────────────────────────────────── */

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function sanitizeUsername(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function clientValidateUsername(value: string): { valid: boolean; reason?: string } {
  if (value.length === 0) return { valid: false };
  if (value.length < 3) return { valid: false, reason: 'At least 3 characters' };
  if (value.length > 32) return { valid: false, reason: 'At most 32 characters' };
  if (!USERNAME_REGEX.test(value)) return { valid: false, reason: 'No leading/trailing hyphens' };
  return { valid: true };
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/* ── Onboarding steps ─────────────────────────────────────────────────── */

type Step = 'username' | 'sync';

/* ── Dismissal key ────────────────────────────────────────────────────── */

function dismissalKey(email: string): string {
  return `useai-onboarding-${email}`;
}

export function wasOnboardingDismissed(email: string | null): boolean {
  if (!email) return false;
  try { return localStorage.getItem(dismissalKey(email)) === '1'; } catch { return false; }
}

function markOnboardingDismissed(email: string) {
  try { localStorage.setItem(dismissalKey(email), '1'); } catch { /* ignore */ }
}

/* ── Component ────────────────────────────────────────────────────────── */

interface OnboardingModalProps {
  config: LocalConfig;
  onComplete: () => void;
}

export function OnboardingModal({ config, onComplete }: OnboardingModalProps) {
  const needsUsername = !config.username;
  const [step, setStep] = useState<Step>(needsUsername ? 'username' : 'sync');

  // ── Username state ──────────────────────────────────────────────────
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameReason, setUsernameReason] = useState<string | undefined>();
  const [usernameSaving, setUsernameSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Sync state ──────────────────────────────────────────────────────
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [syncSaving, setSyncSaving] = useState(false);

  // Focus input on mount
  useEffect(() => {
    if (step === 'username') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // ── Username handlers ───────────────────────────────────────────────
  const handleUsernameChange = useCallback((raw: string) => {
    const value = sanitizeUsername(raw);
    setUsernameInput(value);
    setUsernameReason(undefined);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value) { setUsernameStatus('idle'); return; }

    const local = clientValidateUsername(value);
    if (!local.valid) {
      setUsernameStatus('invalid');
      setUsernameReason(local.reason);
      return;
    }

    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsername(value);
        if (result.available) { setUsernameStatus('available'); setUsernameReason(undefined); }
        else { setUsernameStatus('taken'); setUsernameReason(result.reason ?? 'Already taken'); }
      } catch { setUsernameStatus('invalid'); setUsernameReason('Check failed'); }
    }, 400);
  }, []);

  const handleUsernameSave = useCallback(async () => {
    if (usernameStatus !== 'available') return;
    setUsernameSaving(true);
    try {
      await updateUsername(usernameInput);
      setStep('sync');
    } catch (err) {
      setUsernameStatus('invalid');
      setUsernameReason((err as Error).message);
    } finally {
      setUsernameSaving(false);
    }
  }, [usernameInput, usernameStatus]);

  // ── Sync handler ────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    setSyncSaving(true);
    try {
      await patchConfig({
        sync: {
          enabled: syncEnabled,
          interval_hours: 1,
          include_stats: true,
          include_details: includeDetails,
        },
      });
    } catch { /* proceed anyway */ }
    if (config.email) markOnboardingDismissed(config.email);
    setSyncSaving(false);
    onComplete();
  }, [syncEnabled, includeDetails, config.email, onComplete]);

  const handleSkip = useCallback(() => {
    if (config.email) markOnboardingDismissed(config.email);
    onComplete();
  }, [config.email, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-bg-surface-1 border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-0.5 bg-bg-surface-2">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: step === 'username' ? '50%' : '100%' }}
          />
        </div>

        <div className="p-6">
          {/* ── Step 1: Username ──────────────────────────────────── */}
          {step === 'username' && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold text-text-primary">Claim your username</h2>
              </div>
              <p className="text-[11px] text-text-muted mb-5">
                Your public profile will be at <span className="text-text-secondary font-medium">useai.dev/username</span>. You can change it later.
              </p>

              {/* Username input */}
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted whitespace-nowrap font-medium">useai.dev/</span>
                  <div className="flex-1 flex items-center bg-bg-base border border-border rounded-lg overflow-hidden focus-within:border-accent/50 transition-all">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="username"
                      value={usernameInput}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUsernameSave()}
                      maxLength={32}
                      className="flex-1 px-3 py-2 text-sm bg-transparent text-text-primary outline-none placeholder:text-text-muted/50"
                    />
                    <div className="w-6 h-6 flex items-center justify-center mr-2">
                      {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-text-muted animate-spin" />}
                      {usernameStatus === 'available' && <Check className="w-4 h-4 text-success" />}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && usernameInput.length > 0 && <X className="w-4 h-4 text-error" />}
                    </div>
                  </div>
                </div>
                {usernameReason && (
                  <p className="text-[10px] text-error/80 mt-1.5 ml-[5.5rem]">{usernameReason}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('sync')}
                  className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleUsernameSave}
                  disabled={usernameStatus !== 'available' || usernameSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-bright text-bg-base text-xs font-bold rounded-lg transition-colors disabled:opacity-30"
                >
                  {usernameSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Claim & continue
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Sync ─────────────────────────────────────── */}
          {step === 'sync' && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cloud className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold text-text-primary">Enable cloud sync</h2>
              </div>
              <p className="text-[11px] text-text-muted mb-5">
                Sync your sessions to useai.dev for leaderboards, public profiles, and cross-device access.
                You can change these settings anytime.
              </p>

              {/* Sync toggle */}
              <div className="space-y-3 mb-5">
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Cloud className="w-3 h-3 text-text-muted" />
                      <span className="text-xs font-medium text-text-primary">Auto-sync</span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">Sync session data every hour</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={syncEnabled}
                    onClick={() => setSyncEnabled(!syncEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${syncEnabled ? 'bg-accent' : 'bg-bg-surface-2'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${syncEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </label>

                {syncEnabled && (
                  <>
                    {/* What gets synced */}
                    <div className="rounded-lg border border-border/50 bg-bg-base/50 p-3 space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Always included</span>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Hours, languages, task types, streaks, and evaluation scores.
                      </p>
                    </div>

                    <label className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-bg-base/50 p-3 cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Private details</span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-1">
                          Session titles, project names, evaluation reasons, and milestones. Only visible to you.
                        </p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={includeDetails}
                        onClick={() => setIncludeDetails(!includeDetails)}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 mt-0.5 ${includeDetails ? 'bg-emerald-500' : 'bg-bg-surface-2'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${includeDetails ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </label>
                  </>
                )}

                {!syncEnabled && (
                  <div className="rounded-lg border border-border/50 bg-bg-base/50 p-3">
                    <p className="text-[11px] text-text-muted">
                      All data stays on your machine. You can enable sync later in Settings.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleFinish}
                  disabled={syncSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-bright text-bg-base text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {syncSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {syncEnabled ? 'Enable sync & finish' : 'Finish setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
