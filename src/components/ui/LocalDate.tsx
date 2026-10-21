'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(subscribe, () => true, () => false);

interface LocalDateProps {
  /** ISO 8601 timestamp (stored in UTC). */
  iso: string | null | undefined;
  withTime?: boolean;
  className?: string;
}

/**
 * Timestamps are stored in UTC. The server renders the UTC date (so HTML is deterministic),
 * and after hydration the viewer's own locale and time zone are applied.
 */
export function LocalDate({ iso, withTime = false, className }: LocalDateProps) {
  const isClient = useIsClient();
  if (!iso) return <span className={className}>-</span>;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span className={className}>-</span>;
  const text = isClient
    ? date.toLocaleString(undefined, withTime
        ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: 'short', day: 'numeric' })
    : iso.slice(0, withTime ? 16 : 10).replace('T', ' ');
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
