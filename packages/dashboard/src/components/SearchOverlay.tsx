import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { FeedConversation } from '../lib/api';
import { fetchPrompts } from '../lib/api';
import type { Filters } from '../lib/types';
import type { ConversationGroup } from '../lib/stats';
import { SessionList } from './sessions/SessionList';

const DEFAULT_FILTERS: Filters = { category: 'all', tool: 'all', project: 'all', language: 'all' };

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onDeleteSession?: ((sessionId: string) => void) | undefined;
  onDeleteConversation?: ((connectionId: string) => void) | undefined;
  onDeleteMilestone?: ((milestoneId: string) => void) | undefined;
}

export function SearchOverlay({ open, onClose, onDeleteSession, onDeleteConversation, onDeleteMilestone }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showPublic, setShowPublic] = useState(false);
  const [results, setResults] = useState<FeedConversation[]>([]);
  const [_totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setTotalResults(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // 250ms debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results from server
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setTotalResults(0);
      setHasMore(false);
      return;
    }

    setLoading(true);
    fetchPrompts({
      start: new Date(Date.now() - 32 * 86400000).toISOString(),
      end: new Date().toISOString(),
      search: trimmed,
      offset: 0,
      limit: 50,
    })
      .then((data) => {
        setResults(data.conversations);
        setTotalResults(data.total);
        setHasMore(data.hasMore);
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
      });
  }, [debouncedQuery]);

  const handleLoadMore = useCallback(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed || loading || !hasMore) return;
    setLoading(true);
    fetchPrompts({
      start: new Date(Date.now() - 32 * 86400000).toISOString(),
      end: new Date().toISOString(),
      search: trimmed,
      offset: results.length,
      limit: 50,
    })
      .then((data) => {
        setResults((prev) => [...prev, ...data.conversations]);
        setHasMore(data.hasMore);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery, results.length, loading, hasMore]);

  const hasQuery = debouncedQuery.trim().length > 0;
  const highlightWords = hasQuery ? debouncedQuery.trim().toLowerCase().split(/\s+/) : [];

  // Count total sessions across all conversation groups
  const promptCount = results.reduce((sum, c) => sum + c.prompts.length, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[61] flex items-start justify-center pt-[10vh] px-4 pointer-events-none"
          >
            <div
              className="w-full max-w-2xl bg-bg-base border border-border/50 rounded-xl shadow-2xl flex flex-col max-h-[75vh] pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={showPublic ? 'Search public titles...' : 'Search all sessions and milestones...'}
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 outline-none"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                    className="p-1 rounded-md hover:bg-bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setShowPublic(v => !v)}
                  className={`p-1.5 rounded-md border transition-all duration-200 flex-shrink-0 ${
                    showPublic
                      ? 'bg-success/10 border-success/30 text-success'
                      : 'bg-bg-surface-1 border-border/50 text-text-muted hover:text-text-primary hover:border-text-muted/50'
                  }`}
                  title={showPublic ? 'Searching public titles' : 'Searching private titles'}
                >
                  {showPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-bg-surface-1 text-[10px] font-mono text-text-muted">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto overscroll-none px-4 py-3">
                {!hasQuery ? (
                  <div className="text-center py-12 text-sm text-text-muted/60">
                    Type to search across all sessions
                  </div>
                ) : loading && results.length === 0 ? (
                  <div className="text-center py-12 text-sm text-text-muted/60">
                    Searching...
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-12 text-sm text-text-muted/60">
                    No results for &ldquo;{debouncedQuery.trim()}&rdquo;
                  </div>
                ) : (
                  <>
                    <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-3 px-1">
                      {promptCount} result{promptCount !== 1 ? 's' : ''}
                    </div>
                    <SessionList
                      preGrouped={results as unknown as ConversationGroup[]}
                      filters={DEFAULT_FILTERS}
                      globalShowPublic={showPublic || undefined}
                      showFullDate
                      highlightWords={highlightWords}
                      onDeleteSession={onDeleteSession}
                      onDeleteConversation={onDeleteConversation}
                      onDeleteMilestone={onDeleteMilestone}
                      onLoadMore={handleLoadMore}
                      hasMore={hasMore}
                    />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
